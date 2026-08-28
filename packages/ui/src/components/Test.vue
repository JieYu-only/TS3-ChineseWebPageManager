<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="6">
        <v-card>
          <v-card-title>编辑用户组</v-card-title>
          <v-card-text>
            <v-card outlined>
              <v-card-subtitle>组成员</v-card-subtitle>

              <v-card-text>
                <v-text-field label="筛选"></v-text-field>
                <v-list>
                  <v-list-item-group v-model="selectedMembers" multiple>
                    <v-list-item
                      v-for="member in members"
                      :key="member.name"
                      :value="member"
                    >
                      <template #default="{ active }">
                        <v-list-item-action>
                          <v-checkbox :input-value="active"> </v-checkbox>
                        </v-list-item-action>
                        <v-list-item-content>
                          <v-list-item-title>{{
                            member.name
                          }}</v-list-item-title>
                        </v-list-item-content>
                      </template>
                    </v-list-item>
                  </v-list-item-group>
                </v-list>
              </v-card-text>
              <v-card-actions>
                <v-btn color="primary"><v-icon left>mdi-plus</v-icon>添加</v-btn>
                <v-btn
                  color="error"
                  :disabled="!selectedMembers.length"
                  @click="removeDialog = !removeDialog"
                >
                  <v-icon left>mdi-delete</v-icon>移除
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text color="primary">确定</v-btn>
            <v-btn text @click="$router.go(-1)" color="primary">取消</v-btn>
            <v-btn text color="primary">应用</v-btn>
          </v-card-actions>
        </v-card>

        <v-dialog v-model="removeDialog" max-width="500px">
          <v-card>
            <v-card-title>移除组成员</v-card-title>
            <v-card-text>
              Do you really want to delete all selected users from this group?
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn text color="primary">确定</v-btn>
              <v-btn text color="primary">取消</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      members: [{ name: "sven" }, { name: "peter" }],
      selectedMembers: [],
      removeDialog: false,
    };
  },
  methods: {},
};
</script>
