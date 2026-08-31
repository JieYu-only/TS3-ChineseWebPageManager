<template>
  <v-card variant="outlined" :disabled="disabled">
    <v-card-subtitle>组成员</v-card-subtitle>

    <v-card-text>
      <v-text-field
        label="筛选成员"
        v-model="clientGroupListFilter"
      ></v-text-field>
      <v-list
        height="400"
        class="overflow-y-auto"
        v-model:selected="removeSelection"
        multiple
        selectable
      >
        <v-list-item
          v-for="client in clientGroupList"
          :key="client.cldbid"
          :value="client.cldbid"
        >
          <template #default="{ isSelected }">
            <v-checkbox :model-value="isSelected" hide-details class="mr-3"></v-checkbox>
            <v-list-item-title>
              {{ client.clientNickname }} ({{ client.cldbid }})
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ client.clientUniqueIdentifier }}
            </v-list-item-subtitle>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>
    <v-card-actions>
      <v-dialog v-model="addDialog" max-width="500px">
        <template #activator="{ props }">
          <v-btn v-bind="props" color="primary">
            <v-icon start>mdi-plus</v-icon>添加成员
          </v-btn>
        </template>
        <v-card>
          <v-card-title>选择用户</v-card-title>
          <v-card-text>
            <v-text-field
              label="筛选用户"
              v-model="availableClientsFilter"
            ></v-text-field>
            <v-list
              height="400px"
              class="overflow-y-auto"
              v-model:selected="addSelection"
              multiple
              selectable
            >
              <v-list-item
                v-for="client in availableClients"
                :key="client.cldbid"
                :value="client.cldbid"
              >
                <template #default="{ isSelected }">
                  <v-checkbox :model-value="isSelected" hide-details class="mr-3"></v-checkbox>
                  <v-list-item-title>
                    {{ client.clientNickname }} ({{ client.cldbid }})
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ client.clientUniqueIdentifier }}
                  </v-list-item-subtitle>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              variant="text"
              color="primary"
              @click="addClients"
              :disabled="!addSelection.length"
              >添加</v-btn
            >
            <v-btn variant="text" color="primary" @click="addDialog = false"
              >取消</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-btn
        color="error"
        :disabled="!removeSelection.length"
        class="ml-2"
        @click="removeClients"
      >
        <v-icon start>mdi-delete</v-icon>移除成员
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
<script>
export default {
  props: {
    /**
     * Ids of the clients which are member of the server or channel group.
     * @type {{cldbid: Number}[]}
     */
    modelValue: Array,
    clientDbList: Array,
    disabled: Boolean,
  },
  data() {
    return {
      removeSelection: [],
      addSelection: [],
      addDialog: false,
      clientGroupListFilter: "",
      availableClientsFilter: "",
    };
  },
  computed: {
    availableClients() {
      let regex = new RegExp(
        this.escapeRegex(this.availableClientsFilter),
        "i"
      );

      return this.clientDbList.filter((dbClient) => {
        return (
          !this.modelValue.find((client) => client.cldbid === dbClient.cldbid) &&
          regex.test(dbClient.clientNickname)
        );
      });
    },
    clientGroupList() {
      let regex = new RegExp(this.escapeRegex(this.clientGroupListFilter), "i");

      return this.clientDbList.filter((dbClient) => {
        return (
          this.modelValue.find(({ cldbid }) => cldbid === dbClient.cldbid) &&
          regex.test(dbClient.clientNickname)
        );
      });
    },
  },
  methods: {
    removeClients() {
      let clients = this.modelValue.filter(
        ({ cldbid }) => !this.removeSelection.includes(cldbid)
      );

      this.$emit("update:modelValue", clients);
    },
    addClients() {
      let clients = this.modelValue;

      clients.push(...this.addSelection.map((cldbid) => ({ cldbid })));

      this.$emit("update:modelValue", clients);

      this.addDialog = false;
    },
    escapeRegex(string) {
      return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    },
  },
};
</script>
