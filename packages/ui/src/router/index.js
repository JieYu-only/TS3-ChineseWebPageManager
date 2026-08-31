import { createRouter, createWebHistory } from "vue-router";
import routes from "./routes";
import store from "../store";
import NProgress from "nprogress";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes,
});

router.beforeEach((to, from) => {
  store.commit("isLoading", true);

  NProgress.start();

  if (to.meta.requiresAuth) {
    if (store.state.query.connected) {
      return true;
    } else {
      return { name: "login" };
    }
  } else {
    if (to.name === "login" && store.state.query.connected) {
      return { name: "servers" };
    } else {
      return true;
    }
  }
});

router.afterEach(() => {
  store.commit("isLoading", false);

  setTimeout(() => {
    if (store.state.query.loading) {
      NProgress.inc();
    } else {
      NProgress.done();
    }
  }, 0);
});

export default router;
