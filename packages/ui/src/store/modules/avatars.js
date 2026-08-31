import Vue from "vue";
import localForage from "localforage";
import notify from "@/notify";
import clientService from "@/services/clientService";
import fileService from "@/services/fileService";

/**
 * The avatar images are stored in IndexedDb because the local storage has a size limit of 5MB.
 * VuexPersistence does not support IndexedDb because of its asynchrony.
 * So the data gets synchronised manually between the Vuex state and the IndexedDb database.
 * @type {Object}
 */
const db = localForage.createInstance({
  driver: localForage.INDEXEDDB,
  name: "files",
  storeName: "avatars",
});

const state = {
  // Contains the client database id, information of the avatar file and the file itself as a base64
  files: [],
};

const mutations = {
  saveAvatar(state, avatar) {
    state.files.push(avatar);
  },
  removeAvatar(state, clientDbId) {
    state.files = state.files.filter(
      (avatar) => avatar.clientDbId !== clientDbId
    );
  },
};

const actions = {
  // synchronise IndexedDb database with the Vuex state
  async initState({ state, dispatch }) {
    try {
      await db.iterate((value, key) => {
        if (!state.files.find((avatar) => avatar.clientDbId == key)) {
          dispatch("saveAvatar", value);
        }
      });
    } catch (err) {
      notify.error(err.message);
    }
  },
  getAvatarFileInfo(_context, name) {
    return fileService.getInfo({ channelId: 0, name });
  },
  getClientDbInfo(_context, clientDbId) {
    return clientService.dbInfo(clientDbId);
  },
  async saveAvatar({ commit }, avatar) {
    try {
      commit("saveAvatar", avatar);

      // IndexedDb key does not support numbers
      await db.setItem(avatar.clientDbId.toString(), avatar);
    } catch (err) {
      notify.error(err.message);
    }
  },
  async removeAvatar({ commit }, clientDbId) {
    try {
      commit("removeAvatar", clientDbId);

      await db.removeItem(clientDbId.toString());
    } catch (err) {
      notify.error(err.message);
    }
  },
  async getClientAvatars({ dispatch, state }, clientDbIdList) {
    await dispatch("initState");

    for (let clientDbId of clientDbIdList) {
      try {
        // The serveradmin has no database data
        if (clientDbId !== "1") {
          let clientDbInfo = await dispatch("getClientDbInfo", clientDbId);

          // If client has an avatar
          if (clientDbInfo.clientFlagAvatar) {
            let fileName = `/avatar_${clientDbInfo.clientBase64HashClientUID}`;
            let avatarFileInfo = await dispatch("getAvatarFileInfo", fileName);
            let currentAvatar = state.files.find(
              (avatar) => avatar.name === avatarFileInfo.name
            );

            // Download new avatar file if the datetime has changed or it is not in the list
            if (
              !currentAvatar ||
              currentAvatar.datetime !== avatarFileInfo.datetime
            ) {
              let base64 = await fileService.downloadFileData({
                name: fileName,
                channelId: 0,
              });

              dispatch("removeAvatar", clientDbId);
              dispatch("saveAvatar", {
                ...avatarFileInfo,
                base64,
                clientDbId,
              });
            }
          } else {
            dispatch("removeAvatar", clientDbId);
          }
        }
      } catch (err) {
        notify.error(err.message);
      }
    }
  },
};

export default {
  state,
  mutations,
  actions,
};
