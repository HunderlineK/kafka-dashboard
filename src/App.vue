<template>
  <div>
    <label for="clusters">clusters</label>
    <div id="clusters">
      <select v-model="clusterId">
        <option v-for="{ id } in clusters" :key="id">
          {{ id }}
        </option>
      </select>
      <button @click="getGroups(clusterId)">
        List Consumer Groups
      </button>
    </div>
    <br>
    <div v-if="this.groups.length">
      <label for="groups">consumer groups</label>
      <div id="groups">
        <select v-model="groupId">
          <option v-for="{ groupId } in groups" :key="groupId">
            {{ groupId }}
          </option>
        </select>
        <button @click="getLags(clusterId, groupId)">
          List Lags
        </button>
        <input type="radio" id="subscribed-topics" value="subscribedTopics" v-model="lagDisplay">
        <label for="subscribed-topics">Subscribed Topics</label>
        <input type="radio" id="all-topics" value="allTopics" v-model="lagDisplay">
        <label for="all-tipics">All Topics</label>
        <br>
      </div>
      <br>
      <div>
        <table v-if="lags.length" style="width:100%">
          <tr>
            <th style="text-align: left;">Topic</th>
            <th style="text-align: left;">Partition</th>
            <th style="text-align: left;">Subscribed</th>
            <th style="text-align: left;">Lag</th>
            <th style="text-align: left;">Partition Offsets</th>
          </tr>
          <tr v-for="{ topic, lag, partition, subscribed, partitionOffsets } in lags.filter(({ subscribed }) => subscribed || lagDisplay === 'allTopics')" :key="`${topic}-${partition}`">
            <td>{{ topic }}</td>
            <td>{{ partition }}</td>
            <td>{{ subscribed }}</td>
            <td>{{ lag }}</td>
            <td>{{ partitionOffsets }}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'

export default {
  name: 'App',
  components: {
    HelloWorld
  },

  data () {
    return {
      clusters: [],
      groups: [],
      groupId: '',
      clusterId: '',
      lags: [],
      lagDisplay: 'subscribedTopics'
    }
  },

  async created () {
    this.clusters = await fetch('/api/clusters').then(res => res.json())
    this.clusterId = this.clusters[0] ? this.clusters[0].id : ''
  },

  methods: {
    async getGroups (clusterId) {
      this.groups = await fetch(`/api/clusters/${clusterId}/groups`).then(res => res.json())
      this.groupId = this.groups[0] ? this.groups[0].groupId : ''
    },
    async getLags(clusterId, groupId) {
      const offsetsByTopic = await fetch(`/api/clusters/${clusterId}/groups/${encodeURIComponent(groupId)}`).then(res => res.json())
      this.lags = offsetsByTopic.reduce((expandedLags, { topic, partitions }) => {
        Object.entries(partitions).forEach(([partition, { lag, offsets }]) => {
          expandedLags.push({
            topic,
            partition,
            subscribed: offsets.consumer.offset >= 0,
            lag,
            partitionOffsets: `Low: ${offsets.partition.low}, High: ${offsets.partition.high}, Offset: ${offsets.partition.offset}`
          })
        })
        return expandedLags
      }, [])
    }
  }
}
</script>
