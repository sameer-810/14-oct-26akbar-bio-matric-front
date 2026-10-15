import { QueryClient } from "@tanstack/react-query";

/** The single query client, a module so stores outside the tree can clear it on sign-out. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // a register re-sorting itself while staff compare two rows is worse than slightly old data
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
    // mutations must fail visibly so nobody thinks unsaved attendance was saved
    mutations: { networkMode: "always" },
  },
});
