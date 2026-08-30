import axios from "axios";
import { apiBase } from "./base";

/** @returns {string} URL used to stream the uploaded file back to the server. */
export function getUploadUrl(ticket) {
  return `${apiBase()}/api/file-transfers/${encodeURIComponent(ticket)}/upload`;
}

/** @returns {string} URL used to stream a downloaded file to the client. */
export function getDownloadUrl(ticket) {
  return `${apiBase()}/api/file-transfers/${encodeURIComponent(
    ticket
  )}/download`;
}

/**
 * Ask the server to start an upload and return the transfer ticket.
 * @param {object} params { cid, path, size, cpw, overwrite, resume }
 * @returns {Promise<{ticket: string}>}
 */
export function initFileUpload({
  cid,
  path,
  size,
  cpw = "",
  overwrite = 1,
  resume = 0,
} = {}) {
  return axios
    .post(
      `${apiBase()}/api/file-transfers/upload`,
      { cid, path, size, cpw, overwrite, resume },
      { withCredentials: true }
    )
    .then((res) => res.data);
}

/**
 * Ask the server to prepare a download and return the transfer ticket.
 * @param {object} params { cid, path, cpw, seekpos }
 * @returns {Promise<{ticket: string}>}
 */
export function initFileDownload({ cid, path, cpw = "", seekpos = 0 } = {}) {
  return axios
    .post(
      `${apiBase()}/api/file-transfers/download`,
      { cid, path, cpw, seekpos },
      { withCredentials: true }
    )
    .then((res) => res.data);
}
