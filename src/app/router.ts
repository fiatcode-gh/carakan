import { readable, type Readable } from "svelte/store";

export type TabId = "ladder" | "chart" | "review" | "converter";

export type Route =
  | { readonly kind: "ladder" }
  | { readonly kind: "chart" }
  | { readonly kind: "review" }
  | { readonly kind: "converter" }
  | { readonly kind: "settings" }
  | { readonly kind: "teacher" }
  | { readonly kind: "reviewHelp" }
  | { readonly kind: "lesson"; readonly unitId: string };

export const tabIds: readonly TabId[] = [
  "ladder",
  "chart",
  "review",
  "converter",
];

export const auditRoutes: readonly Route[] = [
  { kind: "ladder" },
  { kind: "chart" },
  { kind: "review" },
  { kind: "converter" },
  { kind: "settings" },
  { kind: "teacher" },
  { kind: "reviewHelp" },
  { kind: "lesson", unitId: "u1" },
];

const ladder = { kind: "ladder" } as Route;

/** Unknown, empty or malformed hashes are the ladder. */
export function parseHash(hash: string): Route {
  const path = hash.startsWith("#/") ? hash.slice(2) : null;
  switch (path) {
    case "":
      return ladder;
    case "chart":
    case "review":
    case "converter":
    case "settings":
    case "teacher":
      return { kind: path };
    case "review-help":
      return { kind: "reviewHelp" };
    case null:
      return ladder;
  }
  const lesson = /^lesson\/([^/]+)$/.exec(path);
  if (lesson?.[1] !== undefined) {
    try {
      return { kind: "lesson", unitId: decodeURIComponent(lesson[1]) };
    } catch {
      return ladder;
    }
  }
  return ladder;
}

export function href(route: Route): string {
  switch (route.kind) {
    case "ladder":
      return "#/";
    case "reviewHelp":
      return "#/review-help";
    case "lesson":
      return `#/lesson/${encodeURIComponent(route.unitId)}`;
    default:
      return `#/${route.kind}`;
  }
}

export function tabOf(route: Route): TabId | null {
  return (tabIds as readonly string[]).includes(route.kind)
    ? (route.kind as TabId)
    : null;
}

export function isTabRoot(route: Route): boolean {
  return tabOf(route) !== null;
}

interface CarakanHistoryState {
  readonly carakan: number;
}

function depth(): number {
  const state = history.state as Partial<CarakanHistoryState> | null;
  return typeof state?.carakan === "number" ? state.carakan : 0;
}

const subscribers = new Set<(route: Route) => void>();
let current: Route = ladder;

function publish(route: Route): void {
  current = route;
  for (const subscriber of subscribers) subscriber(route);
}

/** Reads the location; a hash that is not canonical is rewritten in place. */
function sync(): void {
  const route = parseHash(location.hash);
  const canonical = href(route);
  if (location.hash !== canonical) {
    history.replaceState(history.state, "", canonical);
  }
  publish(route);
}

let listening = false;

function listen(): void {
  if (listening) return;
  listening = true;
  addEventListener("popstate", sync);
  addEventListener("hashchange", sync);
  sync();
}

/** The current route; subscribing starts the location listeners. */
export const route: Readable<Route> = readable(ladder, (set) => {
  listen();
  const subscriber = (next: Route) => set(next);
  subscribers.add(subscriber);
  set(current);
  return () => subscribers.delete(subscriber);
});

/**
 * Tab roots replace the entry, so tab switches never grow the history. Pushed
 * routes push one entry carrying their depth, which `back` relies on.
 */
export function navigate(
  target: Route,
  options: { readonly replace?: boolean } = {},
): void {
  if (isTabRoot(target) || options.replace === true) {
    history.replaceState(history.state, "", href(target));
  } else {
    history.pushState({ carakan: depth() + 1 }, "", href(target));
  }
  publish(target);
}

/** One entry back when this page was pushed; otherwise (deep link) the ladder. */
export function back(): void {
  if (depth() > 0) history.back();
  else navigate(ladder, { replace: true });
}

/**
 * `href` plus a click handler that routes through `navigate`, so links stay
 * real anchors (copy, open in new tab) but never create an untracked entry.
 */
export function routeLink(target: Route): {
  href: string;
  onclick: (event: MouseEvent) => void;
} {
  return {
    href: href(target),
    onclick(event) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      navigate(target);
    },
  };
}
