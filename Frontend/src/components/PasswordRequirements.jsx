import { passwordRequirements } from '../utils/passwordStrength';

export default function PasswordRequirements({ password }) {
  return (
    <div className="rounded-xl border border-dark-600 bg-dark p-3 text-sm text-gray-400">
      <p className="mb-1 font-semibold text-gray-300">Password requirements</p>
      {passwordRequirements.map(([key, label, test]) => {
        const met = test(password || '');
        return <p key={key} className={met ? 'text-green-400' : undefined}>{met ? '✓' : '○'} {label}</p>;
      })}
    </div>
  );
}
