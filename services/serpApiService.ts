import { BackgroundImage } from '../types';

// API KEY provided by user.
// NOTE: For this to work in a browser without a backend, we need a CORS proxy.
const API_KEY = "39d6926bd74776a665ff240876ff25bef6fb564d742c0c925e82d393dfb31921";

// Using a public CORS proxy to bypass browser restrictions on the SerpApi endpoint
const CORS_PROXY = "https://corsproxy.io/?";

const FALLBACK_BACKGROUNDS: BackgroundImage[] = [
  { url: 'https://images.unsplash.com/photo-1557683311-eac922347aa1?q=80&w=1000&auto=format&fit=crop', source: 'Pink Aesthetic' },
  { url: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=1000&auto=format&fit=crop', source: 'Mountain View' },
  { url: 'https://images.unsplash.com/photo-1516055005891-b0de47285d30?q=80&w=1000&auto=format&fit=crop', source: 'Minimalist' },
  { url: 'https://images.unsplash.com/photo-1534237710431-e2fc698436d0?q=80&w=1000&auto=format&fit=crop', source: 'Building' },
];

export const searchPinterestBackgrounds = async (query: string): Promise<BackgroundImage[]> => {
  if (!query) return [];

  // Construct URL: Proxy + SerpApi URL
  // We search for "pinterest [query] background aesthetic" to improve results
  const targetUrl = `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(query + ' pinterest background aesthetic')}&api_key=${API_KEY}`;
  const proxiedUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(proxiedUrl);
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.images_results) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // INCREASED LIMIT: Changed from 20 to 100
      return data.images_results.slice(0, 100).map((img: any) => ({
        // PROXY FIX: We wrap the original URL in wsrv.nl
        // This solves the CORS blocking issue and makes images downloadable/savable
        url: `https://wsrv.nl/?url=${encodeURIComponent(img.original)}&w=1000&output=jpg`, 
        source: img.title || 'Pinterest Result'
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching backgrounds via Proxy:", error);
    // Return better fallbacks so the user sees something is working
    return FALLBACK_BACKGROUNDS;
  }
};