// Profile photos do not need the original multi-megapixel camera image.
// Normalizing them before upload keeps requests reliable with media hosts.
export async function optimizeProfileImage(file) {
  if (!file?.type.startsWith('image/')) {
    throw new Error('Please choose a JPG, PNG, or WebP image.');
  }

  const source = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('Could not prepare that image. Please try another JPG, PNG, or WebP file.');
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'profile'}.jpg`, { type: 'image/jpeg' });
}
