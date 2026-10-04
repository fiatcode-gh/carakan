import { mount } from "svelte";
import App from "./app/App.svelte";
import { createBootstrap, createLocaleRuntime } from "./app/bootstrap.ts";
import "./styles/base.css";
import "./styles/tokens.css";

const target = document.getElementById("app");
if (target === null) throw new Error("#app is missing from index.html");

// Locale first and synchronously: the first render is already localized.
const runtime = createLocaleRuntime();
target.dataset["boot"] = "loading";
mount(App, { target, props: { runtime, boot: createBootstrap(runtime) } });
