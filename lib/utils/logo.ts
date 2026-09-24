export type LogoShape = 'circle' | 'rounded' | 'square';
export type LogoFit = 'cover' | 'contain';

export interface LogoConfig {
  rawUrl: string;
  cleanUrl: string;
  shape: LogoShape;
  fit: LogoFit;
}

/**
 * Parses a logo URL to extract the base image URL, shape (e.g. circle / Instagram style), and image fit.
 * Supports URL search params or hash, e.g. /uploads/logo-123.png?shape=circle&fit=cover
 */
export function parseLogoUrl(logoUrl?: string | null): LogoConfig {
  if (!logoUrl) {
    return {
      rawUrl: '',
      cleanUrl: '',
      shape: 'circle',
      fit: 'cover',
    };
  }

  try {
    const [baseUrl, queryOrHash] = logoUrl.split(/[?#]/);
    const searchParams = new URLSearchParams(queryOrHash || '');
    const shape = (searchParams.get('shape') as LogoShape) || 'circle';
    const fit = (searchParams.get('fit') as LogoFit) || 'cover';

    return {
      rawUrl: logoUrl,
      cleanUrl: baseUrl || logoUrl,
      shape: shape === 'square' || shape === 'rounded' ? shape : 'circle',
      fit: fit === 'contain' ? 'contain' : 'cover',
    };
  } catch {
    return {
      rawUrl: logoUrl,
      cleanUrl: logoUrl,
      shape: 'circle',
      fit: 'cover',
    };
  }
}

/**
 * Formats a clean image URL with shape and fit query parameters.
 */
export function formatLogoUrl(
  rawUrl: string,
  shape: LogoShape = 'circle',
  fit: LogoFit = 'cover'
): string {
  if (!rawUrl) return '';
  const cleanUrl = rawUrl.split(/[?#]/)[0];
  return `${cleanUrl}?shape=${shape}&fit=${fit}`;
}

/**
 * Returns Tailwind CSS class for the chosen shape.
 */
export function getLogoShapeClass(shape: LogoShape = 'circle'): string {
  switch (shape) {
    case 'circle':
      return 'rounded-full';
    case 'rounded':
      return 'rounded-2xl';
    case 'square':
      return 'rounded-lg';
    default:
      return 'rounded-full';
  }
}

/**
 * Returns Tailwind CSS class for image fit.
 */
export function getLogoFitClass(fit: LogoFit = 'cover'): string {
  return fit === 'contain' ? 'object-contain' : 'object-cover';
}

/**
 * Generates initials for a company name (e.g. "Taj Gate" -> "TG", "Apple" -> "A")
 */
export function getCompanyInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'Q';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}
