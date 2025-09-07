import { A as AsyncResultWrapper, a as api } from "./index-CttsGG-Q.js";
const AiAPI = {
  async health() {
    return AsyncResultWrapper.from(api.safe.get("/ai/health")).toResult();
  },
  async catalog() {
    return AsyncResultWrapper.from(api.safe.get("/ai/catalog")).toResult();
  }
};
export {
  AiAPI
};
