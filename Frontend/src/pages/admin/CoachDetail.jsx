import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import Avatar from "../../components/Avatar";
import Notice from "../../components/Notice";
import { optimizeProfileImage } from "../../utils/profileImage";
import PasswordRequirements from "../../components/PasswordRequirements";
import { meetsPasswordRequirements } from "../../utils/passwordStrength";

export default function AdminCoachDetail() {
  const { coachId } = useParams();
  const navigate = useNavigate();
  const [coach, setCoach] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const d = await api.get(`/api/admin/coaches/${coachId}`);
    setCoach(d.coach);
    setAssignments(d.assignments);
    setForm({
      first_name: d.coach.first_name,
      last_name: d.coach.last_name,
      email: d.coach.email,
      phone_number: d.coach.phone_number || "",
      specialty: d.coach.specialty || "",
      bio: d.coach.bio || "",
      is_active: d.coach.is_active,
      new_password: "",
      image: null,
    });
  };

  useEffect(() => {
    load();
  }, [coachId]);

  const update = async (e) => {
    e.preventDefault();
    if (form.new_password && !meetsPasswordRequirements(form.new_password)) {
      setNotice({ type: "error", message: "Please meet all password requirements." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.append("action", "update");
      Object.entries(form).forEach(([k, v]) => v !== null && fd.append(k, v));
      const image = fd.get("image");
      console.debug("[coach-image] FormData prepared", {
        imageIsFile: image instanceof File,
        imageName: image instanceof File ? image.name : null,
        imageType: image instanceof File ? image.type : null,
        imageSizeMB: image instanceof File ? Number((image.size / 1024 / 1024).toFixed(2)) : null,
      });
      const updatedCoach = await api.postForm(`/api/admin/coaches/${coachId}`, fd);
      console.info("[coach-image] Update succeeded", updatedCoach);
      setNotice({ type: "success", message: "Coach updated." });
      await load();
    } catch (err) {
      setNotice({ type: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this coach? This cannot be undone.")) return;
    await api.post(`/api/admin/coaches/${coachId}`, { action: "delete" });
    navigate("/admin/coaches");
  };

  if (!coach || !form) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Avatar user={coach} size={16} />
        <h1 className="font-display text-4xl">{coach.full_name}</h1>
      </div>

      {notice && (
        <Notice
          type={notice.type}
          message={notice.message}
          onDismiss={() => setNotice(null)}
        />
      )}

      <form
        onSubmit={update}
        className="space-y-4 bg-dark-800 border border-dark-600 rounded-2xl p-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <input
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            className="bg-dark border border-dark-600 rounded-xl px-4 py-3"
            placeholder="First name"
          />
          <input
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            className="bg-dark border border-dark-600 rounded-xl px-4 py-3"
            placeholder="Last name"
          />
        </div>
        <input
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3"
          placeholder="Email"
        />
        <input
          type="tel"
          value={form.phone_number}
          onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
          className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3"
          placeholder="Phone number"
        />
        <label className="block text-sm text-gray-400">
          Profile photo{" "}
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              try {
                const original = e.target.files?.[0];
                console.debug("[coach-image] Original selected", {
                  name: original?.name,
                  type: original?.type,
                  sizeMB: original ? Number((original.size / 1024 / 1024).toFixed(2)) : null,
                });
                const optimized = await optimizeProfileImage(original);
                console.debug("[coach-image] Optimized", {
                  name: optimized.name,
                  type: optimized.type,
                  sizeMB: Number((optimized.size / 1024 / 1024).toFixed(2)),
                });
                setForm({
                  ...form,
                  image: optimized,
                });
              } catch (err) {
                console.error("[coach-image] Optimization failed", err);
                setNotice({ type: "error", message: err.message });
              }
            }}
            className="block mt-1 text-sm"
          />
        </label>
        <input
          value={form.specialty}
          onChange={(e) => setForm({ ...form, specialty: e.target.value })}
          className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3"
          placeholder="Specialty"
        />
        <textarea
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          rows={3}
          className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3"
          placeholder="Bio"
        />
        <input
          type="password"
          value={form.new_password}
          onChange={(e) => setForm({ ...form, new_password: e.target.value })}
          className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3"
          placeholder="New password (optional)"
        />
        {form.new_password && <PasswordRequirements password={form.new_password} />}
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Active
        </label>
        <div className="flex gap-3">
          <button
            disabled={busy}
            className="bg-brand text-dark font-bold px-6 py-3 rounded-xl"
          >
            {busy ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={remove}
            className="border border-red-800 text-red-400 font-bold px-6 py-3 rounded-xl hover:bg-red-950"
          >
            Delete Coach
          </button>
        </div>
      </form>

      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
        <h2 className="font-display text-2xl mb-4">
          Assigned Clients ({assignments.length})
        </h2>
        <ul className="space-y-2 text-sm">
          {assignments.map((a) => (
            <li key={a.id} className="flex justify-between">
              <span>{a.client?.full_name}</span>
              <span
                className={a.is_active ? "text-green-400" : "text-gray-500"}
              >
                {a.is_active ? "Active" : "Removed"}
              </span>
            </li>
          ))}
          {assignments.length === 0 && (
            <li className="text-gray-500">No clients assigned yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
