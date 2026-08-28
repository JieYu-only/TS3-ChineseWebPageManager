<template>
  <v-container fluid class="console-page">
    <div class="page-breadcrumb">
      <v-icon small>mdi-home</v-icon><span>控制台</span>
      <v-icon x-small>mdi-chevron-right</v-icon><strong>投诉记录</strong>
    </div>
    <div class="page-title-row">
      <div><h1>投诉记录</h1><p>查看并处理服务器用户投诉记录</p></div>
    </div>
    <v-layout>
      <v-flex xs12>
        <v-card class="content-card" elevation="0">
          <v-card-title>
            <v-btn
              color="error"
              :disabled="!Boolean(selected.length)"
              @click="openDialog(selected)"
            >
              <v-icon left>mdi-delete</v-icon>
              删除所选
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-data-table
              :no-data-text="
                $store.state.query.loading ? '正在加载……' : '暂无投诉记录'
              "
              :headers="headers"
              :items="complaints"
              v-model="selected"
              item-key="timestamp"
              :footer-props="{ 'items-per-page-options': rowsPerPage }"
              show-select
            >
              <template #item.actions="{ item }">
                <v-menu>
                  <template #activator="{ on, attrs }">
                    <v-btn icon v-bind="attrs" v-on="on">
                      <v-icon>mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-item :to="`/client/${item.tcldbid}/ban`">
                      <v-list-item-title>
                        封禁被投诉用户 <b>{{ item.tname }}</b>
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item :to="`/client/${item.fcldbid}/ban`">
                      <v-list-item-title>
                        封禁投诉人 <b>{{ item.fname }}</b>
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="openDialog([item])">
                      <v-list-item-title>删除此投诉</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </template>
              <template #item.message="{ item }">
                <i>"{{ item.message }}"</i>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-flex>
      <v-dialog v-model="dialog" max-width="500px">
        <v-card>
          <v-card-title>删除投诉记录</v-card-title>
          <v-card-text>
            确定要删除所选投诉记录吗？此操作无法撤销。
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text color="primary" @click="dialog = false">取消</v-btn>
            <v-btn text color="error" @click="removeComplaints">删除</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-layout>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      headers: [
        {
          text: "",
          align: "start",
          value: "actions",
        },
        {
          text: "被投诉用户",
          value: "tname",
        },
        {
          text: "投诉人",
          value: "fname",
        },
        {
          text: "投诉原因",
          value: "message",
        },
      ],
      complaints: [],
      selected: [],
      dialog: false,
      selectedComplaints: [],
      rowsPerPage: [25, 50, 75, -1],
    };
  },
  methods: {
    getComplainList() {
      return this.$TeamSpeak.execute("complainlist");
    },
    openDialog(complaints) {
      this.selectedComplaints = complaints;
      this.dialog = true;
    },
    async removeComplaints() {
      try {
        for (let complaint of this.selectedComplaints) {
          await this.$TeamSpeak.execute("complaindel", {
            tcldbid: complaint.tcldbid,
            fcldbid: complaint.fcldbid,
          });
        }
      } catch (err) {
        this.$toast.error(err.message);
      }

      // v-model is not updating correctly when the content of the table changes.
      // Removed content is still in the selectedTableItems array.
      // This is a workaround for this vuetify bug.
      this.selected = [];

      this.dialog = false;

      this.init();
    },
    async init() {
      try {
        this.complaints = await this.getComplainList();
      } catch (err) {
        this.$toast.error(err.message);
      }
    },
  },
  created() {
    this.init();
  },
};
</script>

<style scoped>
.console-page {
  max-width: 1440px;
  padding: 22px 30px 50px;
}
.page-breadcrumb {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 18px;
  color: #9099a8;
  font-size: 12px;
}
.page-breadcrumb strong {
  color: #4b5668;
  font-weight: 500;
}
.page-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.page-title-row h1 {
  margin: 0;
  color: #19253b;
  font-size: 23px;
}
.page-title-row p {
  margin: 4px 0 0;
  color: #929cab;
  font-size: 12px;
}
.content-card {
  overflow: hidden;
}
@media (max-width: 600px) {
  .console-page {
    padding: 16px;
  }
}
</style>
