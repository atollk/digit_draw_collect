export const ssr = false;
export const prerender = true;

// Handle the base path for client-side routing
export const load = ({ url }) => {
	return {
		url: url.pathname
	};
};
