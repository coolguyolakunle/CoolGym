export default function Avatar({ user, size = 12 }) {
  const hasRealImage = user?.image_file && user.image_file !== 'default.jpg';
  const initials = user ? `${(user.first_name || '?')[0]}${(user.last_name || '?')[0]}`.toUpperCase() : '?';
  const dim = `h-${size} w-${size}`;

  if (hasRealImage) {
    return (
      <img
        src={user.image_file}
        alt={user.full_name}
        className={`${dim} rounded-full object-cover border-2 border-brand/60`}
        style={{ height: `${size * 0.25}rem`, width: `${size * 0.25}rem` }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-dark-600 border-2 border-brand/60 flex items-center justify-center text-brand font-display tracking-wider"
      style={{ height: `${size * 0.25}rem`, width: `${size * 0.25}rem`, fontSize: `${size * 0.09}rem` }}
    >
      {initials}
    </div>
  );
}
