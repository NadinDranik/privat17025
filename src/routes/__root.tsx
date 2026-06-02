import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Страница не найдена</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Возможно, она была перемещена или ещё не создана.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Не удалось загрузить страницу
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Повторить
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ГОСТ 17025 · Чаты экспертных консультаций" },
      {
        name: "description",
        content:
          "Экспертные чаты по ГОСТ ISO/IEC 17025-2019 и аккредитации в Росаккредитации. Консультации, материалы, обсуждения по пунктам стандарта.",
      },
      { property: "og:title", content: "ГОСТ 17025 · Чаты экспертных консультаций" },
      {
        property: "og:description",
        content:
          "Экспертные чаты по ГОСТ ISO/IEC 17025-2019. Консультации по аккредитации лабораторий.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "ГОСТ 17025 · Чаты экспертных консультаций" },
      { name: "description", content: "Accreditation Chat Hub: A platform for expert discussions on GOST ISO/IEC 17025-2019 standards." },
      { property: "og:description", content: "Accreditation Chat Hub: A platform for expert discussions on GOST ISO/IEC 17025-2019 standards." },
      { name: "twitter:description", content: "Accreditation Chat Hub: A platform for expert discussions on GOST ISO/IEC 17025-2019 standards." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/INefzjolT5WOPZyqHWED6vzXgc33/social-images/social-1780397356246-Сайт.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/INefzjolT5WOPZyqHWED6vzXgc33/social-images/social-1780397356246-Сайт.webp" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Source+Serif+4:wght@600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthSync() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      qc.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, qc]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      <Outlet />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
