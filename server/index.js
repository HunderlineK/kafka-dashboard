
const ctx = require('express-http-context')
const express = require('express')

const app = express()
app.use(ctx.middleware);
const port = 5000

const { Kafka } = require('kafkajs')
const configs = require('../clusters')

const clusters = configs.map(({ config, meta }) => {
  const kafka = new Kafka(config)
  const admin = kafka.admin()
  return {
    kafka,
    admin,
    meta
  }
})

app.get('/clusters', async (_, res) => {
  res.json(clusters.map(({ meta }) => meta))
})

app.get('/clusters/:id*', async (req, _, next) => {
  const id = req.params.id
  const cluster = clusters.find(({ meta }) => meta.id === id)
  await cluster.admin.connect()
  ctx.set('cluster', cluster)
  next()
})

app.get('/clusters/:id', async (_, res) => {
  const clusterInfo = await ctx.get('cluster').admin.describeCluster()
  res.json(clusterInfo)
})

app.get('/clusters/:id/groups', async (req, res) => {
  const { groups } = await ctx.get('cluster').admin.listGroups()
  res.json(groups)
})

async function getGroupLags (admin, groupId) {
  const topics = await admin.listTopics()
  const offsets = await Promise.all(topics.map(async topic => {
    const [
      topicOffsets,
      consumerOffsets
    ] = await Promise.all([
      admin.fetchTopicOffsets(topic),
      admin.fetchOffsets({ groupId, topic })
    ])

    const partitions = topicOffsets.reduce((partitions, { partition, offset, low, high }, index) => {
      partitions[partition] = {
        lag: high - consumerOffsets[index].offset,
        offsets: {
          consumer: {
            offset: consumerOffsets[index].offset,
            meta: consumerOffsets[index].meta,
          },
          partition: {
            offset,
            high,
            low
          }
        }
      }
      return partitions
    }, {})
    
    return {
      topic,
      lag: Object.values(partitions).reduce((groupLag, { lag }) => lag + groupLag, 0),
      partitions
    }
  }))
  return offsets
}

app.get('/clusters/:id/groups/:groupId', async (req, res) => {
  const lags = await getGroupLags(ctx.get('cluster').admin, req.params.groupId)
  res.json(lags)
})

app.listen(port, () => {
  console.log(`Kafka server listening at http://localhost:${port}`)
})
