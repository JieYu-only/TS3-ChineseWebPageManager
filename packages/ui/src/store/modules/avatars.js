import { defineStore } from "pinia";
import localForage from "localforage";
import notify from "@/notify";
import clientService from "@/services/clientService";
import fileService from "@/services/fileService";

/**
 * The avatar images are stored in IndexedDb because the local storage has a size
 * limit of 5MB. VuexPersistence does not support IndexedDb because of its
 * asynchrony. So the data gets synchronised manually between the store state and
 * the IndexedDb database.
 */
const db = localForage.createInstance({
  driver: localForage.INDEXEDDB,
  name: "files",
  storeName: "avatars",
});

export const useAvatarsStore = defineStore("avatars", {
  state: () => ({
    // Contains the client database id, information of the avatar file and the
    // file itself as a base64.
    files: [],
  }),
  getters: {},
  actions: {
    saveAvatar(avatar) {
      this.files.push(avatar);
    },
    removeAvatar(clientDbId) {
      this.files = this.files.filter(
        (avatar) => avatar.clientDbId !== clientDbId
      );
    },
    // synchronise IndexedDb database with the store state
    async initState() {
      try {
        await db.iterate((value, key) => {
          if (!this.files.find((avatar) => avatar.clientDbId == key)) {
            this.saveAvatar(value);
          }
        });
      } catch (err) {
        notify.error(err.message);
      }
    },
    getAvatarFileInfo(name) {
      return fileService.getInfo({ channelId: 0, name });
    },
    getClientDbInfo(clientDbId) {
      return clientService.dbInfo(clientDbId);
    },
    async saveAvatarAsync(avatar) {
      try {
        this.saveAvatar(avatar);

        // IndexedDb key does not support numbers
        await db.setItem(avatar.clientDbId.toString(), avatar);
      } catch (err) {
        notify.error(err.message);
      }
    },
    async removeAvatarAsync(clientDbId) {
      try {
        this.removeAvatar(clientDbId);

        await db.removeItem(clientDbId.toString());
      } catch (err) {
        notify.error(err.message);
      }
    },
    async getClientAvatars(clientDbIdList) {
      await this.initState();

      for (let clientDbId of clientDbIdList) {
        try {
          // The serveradmin has no database data
          if (clientDbId !== "1") {
            let clientDbInfo = await this.getClientDbInfo(clientDbId);

            // If client has an avatar
            if (clientDbInfo.clientFlagAvatar) {
              let fileName = `/avatar_${clientDbInfo.clientBase64HashClientUID}`;
              let avatarFileInfo = await this.getAvatarFileInfo(fileName);
              let currentAvatar = this.files.find(
                (avatar) => avatar.name === avatarFileInfo.name
              );

              // Download new avatar file if the datetime has changed or it is
              // not in the list
              if (
                !currentAvatar ||
                currentAvatar.datetime !== avatarFileInfo.datetime
              ) {
                let base64 = await fileService.downloadFileData({
                  name: fileName,
                  channelId: 0,
                });

                this.removeAvatar(clientDbId);
                this.saveAvatar({
                  ...avatarFileInfo,
                  base64,
                  clientDbId,
                });
              }
            } else {
              this.removeAvatar(clientDbId);
            }
          }
        } catch (err) {
          notify.error(err.message);
        }
      }
    },
  },
});

export const avatarsMutations = {
  saveAvatar: (state, avatar) => {
    state.files.push(avatar);
  },
  removeAvatar: (state, clientDbId) => {
    state.files = state.files.filter(
      (avatar) => avatar.clientDbId !== clientDbId
    );
  },
};

export default useAvatarsStore;
