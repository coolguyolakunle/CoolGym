import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_URL, api } from '../../api';
import { useAuth } from '../../context/AuthContext';

/**
 * Ported near-verbatim from the original app/static/js/pages/calls.js.
 * The original was DOM-imperative (createElement/appendChild for video tiles),
 * which is kept as-is here inside a ref-scoped effect rather than rewritten as
 * idiomatic React state, since it's proven, working WebRTC signaling logic and
 * a full re-architecture risks introducing new bugs for no functional gain.
 */
export default function Room({ direct = false }) {
  const { roomId: routeRoomId, partnerId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [roomInfo, setRoomInfo] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [status, setStatus] = useState('Preparing call...');
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [joined, setJoined] = useState(false);

  const gridRef = useRef(null);
  const cleanupRef = useRef(null);

  // Resolve which room we're joining (direct calls need to mint a room id first).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        let roomId = routeRoomId;
        if (direct) {
          const res = await api.post('/api/sessions/start', { call_type: 'direct', partner_id: partnerId });
          roomId = res.room_id;
        }
        const info = await api.get(`/api/calls/room/${roomId}`);
        if (!cancelled) setRoomInfo({ ...info, room_id: roomId });
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load this call.');
      }
    })();

    return () => { cancelled = true; };
  }, [routeRoomId, partnerId, direct]);

  // The actual WebRTC + signaling session, started once we know the room.
  useEffect(() => {
    if (!roomInfo || !gridRef.current) return;

    const grid = gridRef.current;
    const roomId = roomInfo.room_id;
    const roomMode = roomInfo.room_mode || 'group';
    const iceServers = roomInfo.ice_servers || [];
    const userName = user?.full_name || 'You';

    const peers = new Map();
    const participantNames = new Map();
    const disconnectTimers = new Map();
    let localStream = null;
    let cameraVideoTrack = null;
    let screenTrack = null;
    let hasJoined = false;

    function createTile(id, label, muted) {
      let tile = document.getElementById(`tile-${id}`);
      if (tile) return tile;
      tile = document.createElement('article');
      tile.id = `tile-${id}`;
      tile.className = id === 'local'
        ? 'call-tile local-tile relative rounded-2xl overflow-hidden bg-dark-800 border border-dark-600'
        : 'call-tile remote-tile relative rounded-2xl overflow-hidden bg-dark-800 border border-dark-600';
      tile.innerHTML = `
        <video playsinline autoplay ${muted ? 'muted' : ''} class="w-full h-full object-cover bg-black"></video>
        <div class="label absolute bottom-2 left-2 text-xs bg-black/60 px-2 py-1 rounded-lg"></div>
      `;
      tile.querySelector('.label').textContent = label;
      grid.appendChild(tile);
      return tile;
    }

    function removeTile(id) {
      const tile = document.getElementById(`tile-${id}`);
      if (tile) tile.remove();
    }

    function attachStream(id, label, stream, muted) {
      const tile = createTile(id, label, muted);
      const video = tile.querySelector('video');
      if (video.srcObject !== stream) video.srcObject = stream;
      video.play().catch(() => setStatus('Click Start camera if your browser paused the preview.'));
    }

    function stopLocalStream() {
      if (!localStream) return;
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
      cameraVideoTrack = null;
    }

    async function replaceOutgoingTracks() {
      peers.forEach((peer) => {
        localStream.getTracks().forEach((track) => {
          const sender = peer.pc.getSenders().find((s) => s.track && s.track.kind === track.kind);
          if (sender) sender.replaceTrack(track);
          else peer.pc.addTrack(track, localStream);
        });
      });
    }

    function mediaErrorHelp(error) {
      if (!window.isSecureContext) return 'Open the site on HTTPS or localhost — browsers block camera access otherwise.';
      const messages = {
        NotAllowedError: 'Camera/microphone permission was blocked. Allow access in your browser and try again.',
        SecurityError: 'The browser blocked camera access. Use HTTPS or localhost.',
        NotFoundError: 'No usable camera or microphone was found on this device.',
        NotReadableError: 'The camera/microphone is already in use by another app.',
        OverconstrainedError: 'The selected device settings are unavailable; retrying with simpler settings.',
      };
      return (error && messages[error.name]) || 'Allow camera or microphone access, then try again.';
    }

    function peerConnection(toSid) {
      const pc = new RTCPeerConnection({ iceServers });
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      if (!localStream.getAudioTracks().length) pc.addTransceiver('audio', { direction: 'recvonly' });
      if (!localStream.getVideoTracks().length) pc.addTransceiver('video', { direction: 'recvonly' });

      pc.ontrack = (event) => {
        const peer = peers.get(toSid);
        if (!peer) return;
        peer.stream = event.streams[0];
        attachStream(toSid, peer.name || 'Participant', peer.stream, false);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) socket.emit('call:ice-candidate', { to: toSid, candidate: event.candidate });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          const t = disconnectTimers.get(toSid);
          if (t) clearTimeout(t);
          disconnectTimers.delete(toSid);
          updateParticipantStatus();
        }
        if (pc.connectionState === 'disconnected') {
          setStatus('Connection interrupted. Reconnecting...');
          const old = disconnectTimers.get(toSid);
          if (old) clearTimeout(old);
          disconnectTimers.set(toSid, setTimeout(() => {
            const peer = peers.get(toSid);
            if (peer && peer.pc.connectionState === 'disconnected') closePeer(toSid);
            disconnectTimers.delete(toSid);
          }, 10000));
        }
        if (['failed', 'closed'].includes(pc.connectionState)) closePeer(toSid);
      };

      return pc;
    }

    function ensurePeer(participant) {
      const sid = participant.sid || participant;
      if (peers.has(sid)) return peers.get(sid);
      const peer = { sid, name: participant.name || participantNames.get(sid) || 'Participant', pc: peerConnection(sid), stream: null };
      peers.set(sid, peer);
      return peer;
    }

    async function callParticipant(participant) {
      const peer = ensurePeer(participant);
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      socket.emit('call:offer', { to: peer.sid, description: peer.pc.localDescription });
    }

    function closePeer(sid) {
      const t = disconnectTimers.get(sid);
      if (t) clearTimeout(t);
      disconnectTimers.delete(sid);
      const peer = peers.get(sid);
      if (peer) peer.pc.close();
      peers.delete(sid);
      removeTile(sid);
      updateParticipantStatus();
    }

    function updateParticipantStatus() {
      const n = peers.size;
      setStatus(n ? `${n} participant${n === 1 ? '' : 's'} connected` : 'Waiting for others to join...');
    }

    async function replaceVideoTrack(nextTrack) {
      peers.forEach((peer) => {
        const sender = peer.pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(nextTrack);
        else if (nextTrack && localStream) peer.pc.addTrack(nextTrack, localStream);
      });
    }

    async function startLocalMedia() {
      setStatus('Starting camera...');
      grid.innerHTML = '';
      stopLocalStream();

      const attempts = [
        { constraints: { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } }, status: 'Camera and microphone ready. Joining room...' },
        { constraints: { video: true, audio: true }, status: 'Camera and microphone ready. Joining room...' },
        { constraints: { video: true, audio: false }, status: 'Camera ready, no microphone found. Joining without audio...' },
        { constraints: { video: false, audio: true }, status: 'Microphone ready, no camera found. Joining with audio only...' },
      ];

      let lastError = null;
      for (const attempt of attempts) {
        try {
          localStream = await navigator.mediaDevices.getUserMedia(attempt.constraints);
          setStatus(attempt.status);
          break;
        } catch (err) {
          lastError = err;
        }
      }
      if (!localStream) throw lastError;

      cameraVideoTrack = localStream.getVideoTracks()[0] || null;
      setMicOn(localStream.getAudioTracks().some((t) => t.enabled));
      setCameraOn(localStream.getVideoTracks().some((t) => t.enabled));
      attachStream('local', `${userName} (you)`, localStream, true);
      if (hasJoined) await replaceOutgoingTracks();
    }

    async function joinCall() {
      if (hasJoined) return;
      try {
        if (!localStream) await startLocalMedia();
        if (socket.connected) {
          socket.emit('call:join', { roomId });
          hasJoined = true;
          setJoined(true);
        } else {
          setStatus('Camera is ready. Connecting signaling...');
        }
      } catch (err) {
        setStatus(`Camera or microphone access failed. ${mediaErrorHelp(err)}`);
      }
    }

    const socket = io(API_URL, { transports: ['polling'], withCredentials: true });

    socket.on('connect', () => { if (!hasJoined) joinCall(); });
    socket.on('connect_error', () => setStatus('Signaling connection failed; retrying...'));
    socket.on('disconnect', () => { hasJoined = false; setJoined(false); setStatus('Signaling disconnected. Reconnecting...'); });

    socket.on('call:participants', async ({ participants }) => {
      participants.forEach((p) => participantNames.set(p.sid, p.name));
      updateParticipantStatus();
      for (const p of participants) await callParticipant(p);
    });
    socket.on('call:user-joined', ({ participant }) => {
      participantNames.set(participant.sid, participant.name);
      setStatus(`${participant.name} joined`);
    });
    socket.on('call:user-left', ({ sid }) => closePeer(sid));
    socket.on('call:offer', async ({ from, description }) => {
      const peer = ensurePeer({ sid: from });
      await peer.pc.setRemoteDescription(description);
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      socket.emit('call:answer', { to: from, description: peer.pc.localDescription });
    });
    socket.on('call:answer', async ({ from, description }) => {
      const peer = peers.get(from);
      if (peer) await peer.pc.setRemoteDescription(description);
    });
    socket.on('call:ice-candidate', async ({ from, candidate }) => {
      const peer = peers.get(from);
      if (peer && candidate) await peer.pc.addIceCandidate(candidate);
    });
    socket.on('call:error', ({ message }) => setStatus(message || 'Unable to join this call.'));

    joinCall();

    // Expose controls to the toolbar buttons via the cleanup ref's sibling refs.
    cleanupRef.current = {
      toggleMic: () => {
        if (!localStream) return;
        const enabled = localStream.getAudioTracks().some((t) => t.enabled);
        localStream.getAudioTracks().forEach((t) => { t.enabled = !enabled; });
        setMicOn(!enabled);
      },
      toggleCamera: () => {
        if (!localStream) return;
        const enabled = localStream.getVideoTracks().some((t) => t.enabled);
        localStream.getVideoTracks().forEach((t) => { t.enabled = !enabled; });
        setCameraOn(!enabled);
      },
      toggleScreenShare: async () => {
        if (!localStream) return;
        if (screenTrack) {
          screenTrack.stop();
          return;
        }
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenTrack = screenStream.getVideoTracks()[0];
          await replaceVideoTrack(screenTrack);
          if (cameraVideoTrack) localStream.removeTrack(cameraVideoTrack);
          localStream.addTrack(screenTrack);
          attachStream('local', `${userName} (you)`, localStream, true);
          setScreenSharing(true);

          screenTrack.onended = async () => {
            localStream.removeTrack(screenTrack);
            if (cameraVideoTrack) {
              localStream.addTrack(cameraVideoTrack);
              await replaceVideoTrack(cameraVideoTrack);
            }
            screenTrack = null;
            attachStream('local', `${userName} (you)`, localStream, true);
            setScreenSharing(false);
          };
        } catch {
          setStatus('Screen sharing was cancelled.');
        }
      },
      leave: () => {
        socket.emit('call:leave');
        peers.forEach((peer) => peer.pc.close());
        peers.clear();
        if (localStream) localStream.getTracks().forEach((t) => t.stop());
      },
    };

    const beforeUnload = () => socket.emit('call:leave');
    window.addEventListener('beforeunload', beforeUnload);

    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      socket.emit('call:leave');
      peers.forEach((peer) => peer.pc.close());
      peers.clear();
      if (localStream) localStream.getTracks().forEach((t) => t.stop());
      socket.disconnect();
      grid.innerHTML = '';
    };
  }, [roomInfo, user]);

  const leaveCall = () => {
    cleanupRef.current?.leave();
    navigate(-1);
  };

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-dark text-center px-6">
        <p className="text-red-400">{loadError}</p>
        <button onClick={() => navigate(-1)} className="bg-brand text-dark font-bold px-6 py-3 rounded-xl">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-dark-600">
        <div>
          <h1 className="font-display text-2xl text-brand">{roomInfo?.room_title || 'Call'}</h1>
          <p className="text-xs text-gray-500">{status}</p>
        </div>
        <button onClick={leaveCall} className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-sm">
          Leave Call
        </button>
      </header>

      <div ref={gridRef} className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 auto-rows-fr" />

      <footer className="flex items-center justify-center gap-3 p-4 border-t border-dark-600">
        <button onClick={() => cleanupRef.current?.toggleMic()} className={`px-4 py-2 rounded-xl text-sm font-semibold border ${micOn ? 'border-dark-600 text-gray-300' : 'bg-red-600 border-red-600 text-white'}`}>
          <i className={`fa-solid ${micOn ? 'fa-microphone' : 'fa-microphone-slash'} mr-2`} />
          {micOn ? 'Mute' : 'Unmute'}
        </button>
        <button onClick={() => cleanupRef.current?.toggleCamera()} className={`px-4 py-2 rounded-xl text-sm font-semibold border ${cameraOn ? 'border-dark-600 text-gray-300' : 'bg-red-600 border-red-600 text-white'}`}>
          <i className={`fa-solid ${cameraOn ? 'fa-video' : 'fa-video-slash'} mr-2`} />
          {cameraOn ? 'Camera off' : 'Camera on'}
        </button>
        <button onClick={() => cleanupRef.current?.toggleScreenShare()} className={`px-4 py-2 rounded-xl text-sm font-semibold border ${screenSharing ? 'bg-brand text-dark border-brand' : 'border-dark-600 text-gray-300'}`}>
          <i className="fa-solid fa-display mr-2" />
          {screenSharing ? 'Stop sharing' : 'Share screen'}
        </button>
      </footer>
    </div>
  );
}
