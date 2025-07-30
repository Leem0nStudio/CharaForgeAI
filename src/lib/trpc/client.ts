
"use client";

import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import type { AppRouter } from "./server";
import { getAuth } from "firebase/auth";
import { QueryClient } from "@tanstack/react-query";

export const trpc = createTRPCReact<AppRouter>({});

export const queryClient = new QueryClient();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `/api/trpc`,
      async headers() {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          return {};
        }

        const token = await user.getIdToken();
        return {
          Authorization: `Bearer ${token}`,
        };
      },
    }),
  ],
});
