import store from "./store";

// Translate common browser and connection errors before displaying them.
// Unknown TeamSpeak errors are kept intact so administrators can still search
// the original server response when troubleshooting.
const errorTranslations = [
  [/^Failed to fetch$/i, "网络请求失败，请检查管理服务是否正常运行"],
  [/^Network ?Error/i, "网络连接失败，请检查网络或服务地址"],
  [/^Load failed$/i, "请求加载失败，请检查网络连接"],
  [/timeout|timed out/i, "请求超时，请稍后重试"],
  [/unauthorized|not authorized|401/i, "登录状态已失效，请重新登录"],
  [/forbidden|403/i, "当前账号没有执行此操作的权限"],
  [/not found|404/i, "请求的资源不存在"],
  [/internal server error|500/i, "服务器内部错误，请查看服务日志"],
  [/ECONNREFUSED/i, "无法连接到目标服务，请检查地址和端口"],
  [/ENOTFOUND/i, "无法解析服务器地址，请检查主机名"],
  [/socket.*disconnect|disconnected/i, "与服务器的连接已断开"],
  [/invalid loginname or password|invalid password/i, "用户名或密码错误"],
  [/insufficient client permissions/i, "当前账号权限不足，无法完成此操作"],
  [/invalid parameter/i, "提交的参数无效，请检查输入内容"],
  [/database empty result set/i, "没有找到符合条件的数据"],
  [/connection failed|could not connect/i, "连接 TeamSpeak 服务器失败"],
  [/server.*offline/i, "目标服务器当前未运行"],
  [/file not found/i, "未找到指定文件"],
  [/already member of group/i, "该用户已经属于此用户组"],
  [/not a member of group/i, "该用户不属于此用户组"],
  [/channel name is already in use/i, "频道名称已被使用"],
  [/nickname is already in use/i, "昵称已被使用"],
  [/invalid uid/i, "用户唯一标识（UID）无效"],
];

/**
 * Extract a human-readable message from an error, error-like object or string.
 * @param {*} input
 * @returns {string}
 */
function toMessage(input) {
  if (input === null || input === undefined) return "未知错误";
  if (input instanceof Error) return input.message;
  if (typeof input === "object" && input.message != null) return input.message;
  return String(input);
}

function translateError(error) {
  const rawMessage = toMessage(error);
  const translated = errorTranslations.find(([pattern]) =>
    pattern.test(rawMessage)
  );

  if (translated) return translated[1];

  if (/[\u4e00-\u9fff]/.test(rawMessage)) return rawMessage;

  const errorCode = rawMessage.match(/(?:error\s*)?(?:id|code)\D*(\d+)/i);
  return `操作失败，请检查输入和服务器状态${
    errorCode ? `（错误码：${errorCode[1]}）` : ""
  }`;
}

/**
 * The app-owned notification service. Backed by a global Vuetify snackbar
 * (see GlobalNotifications.vue) so no third-party toast plugin is needed.
 * @type {{
 *   success: (message: *, options?: object) => void,
 *   info: (message: *, options?: object) => void,
 *   warning: (message: *, options?: object) => void,
 *   error: (error: *, options?: object) => void,
 * }}
 */
const notify = {
  success(message, options = {}) {
    store.commit("enqueueNotification", {
      message: toMessage(message),
      type: "success",
      duration: options.duration,
    });
  },
  info(message, options = {}) {
    store.commit("enqueueNotification", {
      message: toMessage(message),
      type: "info",
      duration: options.duration,
    });
  },
  warning(message, options = {}) {
    store.commit("enqueueNotification", {
      message: toMessage(message),
      type: "warning",
      duration: options.duration,
    });
  },
  error(error, options = {}) {
    store.commit("enqueueNotification", {
      message: translateError(error),
      type: "error",
      duration: options.duration,
    });
  },
};

export default notify;
