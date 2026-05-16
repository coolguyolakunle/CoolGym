(function () {
  const root = document.getElementById('call-room');
  if (!root) return;

  const roomId = root.dataset.roomId;
  const roomMode = root.dataset.roomMode || 'group';
  const iceServers = JSON.parse(root.dataset.iceServers || '[]');
  const grid = document.getElementById('video-grid');
  const statusEl = document.getElementById('call-status');
  const micBtn = document.getElementById('toggle-mic');
  const cameraBtn = document.getElementById('toggle-camera');
  const screenBtn = document.getElementById('toggle-screen');
  const leaveBtn = document.getElementById('leave-call');
  const startBtn = document.getElementById('start-call');
  const copyBtn = document.getElementById('copy-link');
  const devicePanel = document.getElementById('device-panel');
  const cameraSelect = document.getElementById('camera-select');
  const micSelect = document.getElementById('mic-select');

  const peers = new Map();
  const participantNames = new Map();
  const disconnectTimers = new Map();
  let localStream = null;
  let cameraVideoTrack = null;
  let screenTrack = null;
  let hasJoined = false;
  let isStarting = false;
  let knownDevices = [];

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function showMediaError(message) {
    setStatus(message);
    grid.innerHTML = `<div class="call-tile"><div class="empty">${message}</div></div>`;
    updateVideoLayout();
    if (startBtn) {
      startBtn.classList.remove('hidden');
      startBtn.disabled = false;
      startBtn.textContent = 'Try camera again';
    }
  }

  function deviceOptionLabel(device, index, fallback) {
    return device.label || `${fallback} ${index + 1}`;
  }

  function setDeviceOptions(select, devices, fallback) {
    select.innerHTML = '';
    if (!devices.length) {
      select.appendChild(new Option(`No ${fallback.toLowerCase()} found`, ''));
      select.disabled = true;
      return;
    }

    devices.forEach((device, index) => {
      select.appendChild(new Option(deviceOptionLabel(device, index, fallback), device.deviceId));
    });
    select.disabled = false;
  }

  async function loadDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

    knownDevices = await navigator.mediaDevices.enumerateDevices();
    const cameras = knownDevices.filter((device) => device.kind === 'videoinput');
    const microphones = knownDevices.filter((device) => device.kind === 'audioinput');

    if (devicePanel) {
      devicePanel.classList.toggle('hidden', cameras.length + microphones.length === 0);
    }

    if (cameraSelect) {
      setDeviceOptions(cameraSelect, cameras, 'Camera');
    }

    if (micSelect) {
      setDeviceOptions(micSelect, microphones, 'Microphone');
    }

    if (!localStream) {
      setStatus(cameras.length || microphones.length
        ? `Found ${cameras.length} camera(s) and ${microphones.length} microphone(s). Click Start camera.`
        : 'No camera or microphone was found by this browser.');
    }
  }

  function stopLocalStream() {
    if (!localStream) return;
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
    cameraVideoTrack = null;
  }

  async function replaceOutgoingTracks() {
    peers.forEach((peer) => {
      localStream.getTracks().forEach((track) => {
        const sender = peer.pc.getSenders().find((item) => item.track && item.track.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          peer.pc.addTrack(track, localStream);
        }
      });
    });
  }

  function selectedConstraints(videoEnabled, audioEnabled) {
    const videoDeviceId = cameraSelect && cameraSelect.value;
    const audioDeviceId = micSelect && micSelect.value;
    const video = {
      width: { ideal: 1280 },
      height: { ideal: 720 }
    };
    const audio = {
      echoCancellation: true,
      noiseSuppression: true
    };

    if (videoDeviceId) video.deviceId = { exact: videoDeviceId };
    if (audioDeviceId) audio.deviceId = { exact: audioDeviceId };

    return {
      video: videoEnabled ? video : false,
      audio: audioEnabled ? audio : false
    };
  }

  function mediaErrorHelp(error) {
    if (!window.isSecureContext) {
      return 'Open the site on HTTPS or localhost. Browsers block camera access on normal HTTP pages.';
    }

    if (!error || !error.name) {
      return 'Allow camera or microphone access, then try again.';
    }

    const messages = {
      NotAllowedError: 'Camera or microphone permission was blocked. Click the browser permission icon near the address bar, allow access, then try again.',
      SecurityError: 'The browser blocked camera access for this page. Use HTTPS or localhost and allow permissions.',
      NotFoundError: 'No usable camera or microphone was found on this device. Connect or enable one, then try again.',
      NotReadableError: 'The camera or microphone is already in use by another app. Close other video apps, then try again.',
      OverconstrainedError: 'The selected camera or microphone settings are not available. The app will retry with simpler settings.'
    };

    return messages[error.name] || 'Allow camera or microphone access, then try again.';
  }

  function updateControlAvailability() {
    const hasAudio = localStream && localStream.getAudioTracks().length > 0;
    const hasVideo = localStream && localStream.getVideoTracks().length > 0;

    micBtn.disabled = !hasAudio;
    cameraBtn.disabled = !hasVideo;
    screenBtn.disabled = !localStream;
    micBtn.classList.toggle('disabled', !hasAudio);
    cameraBtn.classList.toggle('disabled', !hasVideo);
    screenBtn.classList.toggle('disabled', !localStream);
    micBtn.textContent = hasAudio ? 'Mute' : 'No mic';
    cameraBtn.textContent = hasVideo ? 'Camera off' : 'No camera';
  }

  if (typeof io !== 'function') {
    showMediaError('Socket.IO browser client could not load. Check your internet connection or vendor socket.io.min.js locally.');
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showMediaError('Camera access requires HTTPS or localhost, and a browser that supports WebRTC.');
    return;
  }

  updateControlAvailability();
  loadDevices().catch(() => {
    setStatus('Click Start camera to request device access.');
  });

  const socket = io({ transports: ['polling'] });

  function createTile(id, label, muted) {
    let tile = document.getElementById(`tile-${id}`);
    if (tile) return tile;

    tile = document.createElement('article');
    tile.id = `tile-${id}`;
    tile.className = id === 'local' ? 'call-tile local-tile' : 'call-tile remote-tile';
    tile.innerHTML = `
      <video playsinline autoplay ${muted ? 'muted' : ''}></video>
      <div class="label"></div>
    `;
    tile.querySelector('.label').textContent = label;
    grid.appendChild(tile);
    updateVideoLayout();
    return tile;
  }

  function updateVideoLayout() {
    const remoteTiles = Array.from(grid.querySelectorAll('.remote-tile'));
    remoteTiles.forEach((tile, index) => {
      const isPrimaryDirectRemote = roomMode === 'direct' && index === 0;
      tile.classList.toggle('primary-remote', isPrimaryDirectRemote);
      tile.classList.toggle('secondary-remote', roomMode === 'direct' && index > 0);
    });

    const hasRemoteVideo = remoteTiles.length > 0;
    grid.classList.toggle('has-remote', hasRemoteVideo);
    grid.classList.toggle('direct-call', roomMode === 'direct');
  }

  function removeTile(id) {
    const tile = document.getElementById(`tile-${id}`);
    if (tile) tile.remove();
    updateVideoLayout();
  }

  function attachStream(id, label, stream, muted) {
    const tile = createTile(id, label, muted);
    const video = tile.querySelector('video');
    if (video.srcObject !== stream) video.srcObject = stream;
    video.play().catch(() => {
      setStatus('Click Start camera if your browser paused the video preview.');
    });
  }

  function peerConnection(toSid) {
    const pc = new RTCPeerConnection({ iceServers });

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    if (!localStream.getAudioTracks().length) {
      pc.addTransceiver('audio', { direction: 'recvonly' });
    }
    if (!localStream.getVideoTracks().length) {
      pc.addTransceiver('video', { direction: 'recvonly' });
    }

    pc.ontrack = (event) => {
      const peer = peers.get(toSid);
      if (!peer) return;
      peer.stream = event.streams[0];
      attachStream(toSid, peer.name || 'Participant', peer.stream, false);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call:ice-candidate', { to: toSid, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        const timer = disconnectTimers.get(toSid);
        if (timer) clearTimeout(timer);
        disconnectTimers.delete(toSid);
        updateParticipantStatus();
      }

      if (pc.connectionState === 'disconnected') {
        setStatus('Connection interrupted. Reconnecting...');
        const oldTimer = disconnectTimers.get(toSid);
        if (oldTimer) clearTimeout(oldTimer);
        disconnectTimers.set(toSid, setTimeout(() => {
          const peer = peers.get(toSid);
          if (peer && peer.pc.connectionState === 'disconnected') {
            closePeer(toSid);
          }
          disconnectTimers.delete(toSid);
        }, 10000));
      }

      if (['failed', 'closed'].includes(pc.connectionState)) {
        closePeer(toSid);
      }
    };

    return pc;
  }

  function ensurePeer(participant) {
    const sid = participant.sid || participant;
    if (peers.has(sid)) return peers.get(sid);

    const peer = {
      sid,
      name: participant.name || participantNames.get(sid) || 'Participant',
      pc: peerConnection(sid),
      stream: null
    };
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
    const timer = disconnectTimers.get(sid);
    if (timer) clearTimeout(timer);
    disconnectTimers.delete(sid);

    const peer = peers.get(sid);
    if (peer) peer.pc.close();
    peers.delete(sid);
    removeTile(sid);
    updateParticipantStatus();
  }

  function updateParticipantStatus() {
    const remoteCount = peers.size;
    const noun = remoteCount === 1 ? 'participant' : 'participants';
    setStatus(remoteCount ? `${remoteCount} ${noun} connected` : 'Waiting for others to join...');
  }

  async function replaceVideoTrack(nextTrack) {
    peers.forEach((peer) => {
      const sender = peer.pc.getSenders().find((item) => item.track && item.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(nextTrack);
      } else if (nextTrack && localStream) {
        peer.pc.addTrack(nextTrack, localStream);
      }
    });
  }

  async function startLocalMedia() {
    setStatus('Starting camera...');
    grid.innerHTML = '';
    updateVideoLayout();
    stopLocalStream();

    const attempts = [
      {
        constraints: selectedConstraints(true, true),
        status: 'Camera and microphone are ready. Joining room...'
      },
      {
        constraints: { video: true, audio: true },
        status: 'Camera and microphone are ready. Joining room...'
      },
      {
        constraints: { video: true, audio: false },
        status: 'Camera is ready, but no microphone was found. Joining without audio...'
      },
      {
        constraints: { video: false, audio: true },
        status: 'Microphone is ready, but no camera was found. Joining with audio only...'
      }
    ];

    let lastError = null;
    for (const attempt of attempts) {
      try {
        localStream = await navigator.mediaDevices.getUserMedia(attempt.constraints);
        setStatus(attempt.status);
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!localStream) throw lastError;

    cameraVideoTrack = localStream.getVideoTracks()[0] || null;
    await loadDevices().catch(() => {});
    updateControlAvailability();
    attachStream('local', `${root.dataset.userName} (you)`, localStream, true);
    if (hasJoined) await replaceOutgoingTracks();
    if (startBtn) startBtn.classList.add('hidden');
  }

  async function joinCall() {
    if (hasJoined || isStarting) return;
    isStarting = true;

    try {
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = 'Starting...';
      }
      if (!localStream) await startLocalMedia();

      if (socket.connected) {
        socket.emit('call:join', { roomId });
        hasJoined = true;
      } else {
        setStatus('Camera is ready. Connecting signaling...');
      }
    } catch (error) {
      const reason = error && error.name ? ` (${error.name})` : '';
      const help = mediaErrorHelp(error);
      showMediaError(`Camera or microphone access failed${reason}. ${help}`);
      updateControlAvailability();
    } finally {
      if (startBtn && !localStream) {
        startBtn.disabled = false;
        startBtn.textContent = 'Try camera again';
      }
      isStarting = false;
    }
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      joinCall();
    });
  }

  [cameraSelect, micSelect].forEach((select) => {
    if (!select) return;
    select.addEventListener('change', async () => {
      if (!localStream) return;
      try {
        if (startBtn) {
          startBtn.classList.remove('hidden');
          startBtn.textContent = 'Switching...';
          startBtn.disabled = true;
        }
        await startLocalMedia();
        if (startBtn) startBtn.textContent = 'Start camera';
      } catch (error) {
        showMediaError(`Could not switch device. ${mediaErrorHelp(error)}`);
      }
    });
  });

  micBtn.addEventListener('click', () => {
    if (!localStream) return;
    const enabled = localStream.getAudioTracks().some((track) => track.enabled);
    localStream.getAudioTracks().forEach((track) => { track.enabled = !enabled; });
    micBtn.classList.toggle('active', enabled);
    micBtn.textContent = enabled ? 'Unmute' : 'Mute';
    micBtn.setAttribute('aria-pressed', String(enabled));
  });

  cameraBtn.addEventListener('click', () => {
    if (!localStream) return;
    const enabled = localStream.getVideoTracks().some((track) => track.enabled);
    localStream.getVideoTracks().forEach((track) => { track.enabled = !enabled; });
    cameraBtn.classList.toggle('active', enabled);
    cameraBtn.textContent = enabled ? 'Camera on' : 'Camera off';
    cameraBtn.setAttribute('aria-pressed', String(enabled));
  });

  screenBtn.addEventListener('click', async () => {
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
      attachStream('local', `${root.dataset.userName} (you)`, localStream, true);
      screenBtn.classList.add('active');
      screenBtn.textContent = 'Stop sharing';

      screenTrack.onended = async () => {
        localStream.removeTrack(screenTrack);
        if (cameraVideoTrack) {
          localStream.addTrack(cameraVideoTrack);
          await replaceVideoTrack(cameraVideoTrack);
        }
        screenTrack = null;
        attachStream('local', `${root.dataset.userName} (you)`, localStream, true);
        screenBtn.classList.remove('active');
        screenBtn.textContent = 'Share screen';
      };
    } catch (error) {
      setStatus('Screen sharing was cancelled.');
      updateParticipantStatus();
    }
  });

  leaveBtn.addEventListener('click', () => {
    socket.emit('call:leave');
    peers.forEach((peer) => peer.pc.close());
    peers.clear();
    if (localStream) localStream.getTracks().forEach((track) => track.stop());
    window.location.href = root.dataset.returnUrl || '/';
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(window.location.href);
      copyBtn.textContent = 'Link copied';
      setTimeout(() => { copyBtn.textContent = 'Copy invite link'; }, 1800);
    });
  }

  socket.on('connect', () => {
    if (!hasJoined) joinCall();
  });

  socket.on('connect_error', () => {
    setStatus('Camera is ready. Signaling connection failed; retrying...');
  });

  socket.on('disconnect', () => {
    hasJoined = false;
    setStatus('Signaling disconnected. Reconnecting...');
  });

  socket.on('call:participants', async ({ participants }) => {
    participants.forEach((participant) => participantNames.set(participant.sid, participant.name));
    updateParticipantStatus();
    for (const participant of participants) {
      await callParticipant(participant);
    }
  });

  socket.on('call:user-joined', ({ participant }) => {
    participantNames.set(participant.sid, participant.name);
    setStatus(`${participant.name} joined`);
  });

  socket.on('call:user-left', ({ sid }) => {
    closePeer(sid);
  });

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

  socket.on('call:error', ({ message }) => {
    setStatus(message || 'Unable to join this call.');
  });

  window.addEventListener('beforeunload', () => {
    socket.emit('call:leave');
  });

  joinCall();
})();
