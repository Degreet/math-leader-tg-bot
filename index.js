const Telegraf = require("telegraf")
const { MongoClient } = require("mongodb")
const { Stage, session } = Telegraf
const Scene = require("telegraf/scenes/base")
const dotenv = require('dotenv')

const m = require("./modules/m.js")
const msg = require("./modules/msg.js")
const check = require("./modules/check.js")
const basicFailCallback = require("./modules/basicFailCallback.js")
const menu = require("./modules/menu.js")
const rnd = require("./modules/rnd.js")
dotenv.config()

const dbName = "math-leader-bot"
const { TOKEN, KEY } = process.env

const bot = new Telegraf(TOKEN)
const uri = `mongodb+srv://Node:${KEY}@cluster0-ttfss.mongodb.net/${dbName}?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })

function generateQuestionScene() {
  const scene = new Scene("start_singleplay")

  scene.action("cancel", async ctx => {
    ctx.scene.leave()
    ctx.deleteMessage()
    await showMenu(ctx)
  })

  scene.on("message", async ctx => {
    const userId = ctx.from.id

    check.candidate({ userId }, async user => {
      let { lastSinglePlayQuestion, singlePlayData } = user
      thisPlayData = singlePlayData[lastSinglePlayQuestion]

      const answer = +ctx.message.text
      if (isNaN(answer)) return msg.send(userId, `Так отвечать нельзя! Попробуй ещё раз`)

      const result = thisPlayData.first +
        thisPlayData.second
      const success = result == answer
      let successAnswers = user.successAnswers || 0

      lastSinglePlayQuestion++

      const isEnd = lastSinglePlayQuestion >= 4
      let next

      if (success) successAnswers++

      if (isEnd) {
        time = Math.floor((Date.now() - user.startTime) / 1000)
        next = `Конец! Твои результаты: ${successAnswers}/5\nЗаняло времени: ${time} сек.`
      } else {
        thisPlayData = singlePlayData[lastSinglePlayQuestion]
        next = `${lastSinglePlayQuestion + 1} вопрос:\n<b>
${thisPlayData.first}+${thisPlayData.second}=?</b>`
      }

      const extra = isEnd ? m.build([m.cbb("◀️ Назад", "backToMenu")]) : {}
      if (success) {
        msg.send(userId, `🎉 Верно!\n${next}`, extra)
      } else {
        msg.send(userId, `👎 Неверно! Верный ответ: ${result}.\n${next}`, extra)
      }

      await users.updateOne({ userId }, {
        $set: {
          lastSinglePlayQuestion,
          successAnswers
        },
        $push: {
          history: {
            $each: [
              ctx.message.message_id,
              ctx.message.message_id + 1
            ]
          }
        }
      })

      if (isEnd) ctx.scene.leave()
      else ctx.scene.reenter()
    }, () => basicFailCallback(ctx))
  })

  return scene
}

const stage = new Stage([
  generateQuestionScene()
])

bot.use(session())
bot.use(stage.middleware())

bot.command("start", async ctx => {
  const userId = ctx.from.id

  check.candidate({ userId }, async () => {
    msg.send(userId, `👋 С возвращением, <b>${ctx.from.first_name}</b>!`, menu.markup.full)
  }, async () => {
    msg.send(userId, `👋 Привет, <b>${ctx.from.first_name}</b>!`, menu.markup.full)

    await users.insertOne({
      userId,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      history: []
    })
  })
})

bot.action("backToMenu", async ctx => {
  const userId = ctx.from.id

  check.candidate({ userId }, async user => {
    user.history.forEach(id => {
      bot.telegram.deleteMessage(userId, id)
    })

    await users.updateOne({ userId }, {
      $inc: {
        gamesPlayed: 1
      },
      $set: {
        history: []
      }
    })

    await showMenu(ctx)
  }, () => basicFailCallback(ctx))
})

bot.action("menu", showMenu)
async function showMenu(ctx) {
  const userId = ctx.from.id

  check.candidate({ userId }, async user => {
    const stats = `
Ваш ID: <b>${userId}</b>
Побед: <b>${user.wins}</b>
Поражений: <b>${user.losses}</b>
Игр сыграно: <b>${user.gamesPlayed}</b>`

    msg.editLast(ctx, `👋 Привет, <b>${ctx.from.first_name}</b>!\n${stats}`, m.build(
      [
        m.cbb("▶️ Играть", "play")
      ]
    ))
  }, () => basicFailCallback(ctx))
}

bot.action("play", async ctx => {
  const userId = ctx.from.id

  check.candidate({ userId }, async () => {
    msg.editLast(ctx, `♻️ Выберите режим:`, m.build(
      [
        [
          m.cbb("1️⃣ Одиночная игра", "single_play"),
          m.cbb("Сетевая игра 🌐", "multiplayer")
        ],
        [
          menu.markup.left
        ]
      ]
    ))
  }, () => basicFailCallback(ctx))
})

bot.action("single_play", async ctx => {
  const userId = ctx.from.id

  check.candidate({ userId }, async user => {
    const singlePlayData = [
      {
        first: rnd(100, 500),
        second: rnd(100, 500)
      }
    ]

    for (let i = 1; singlePlayData.length != 5; i++) {
      singlePlayData.push({
        first: rnd(100, 500),
        second: rnd(100, 500)
      })
    }

    let msgId
    msg.delLast(ctx)
    await msg.send(userId, `📕 1 пример:\n<b>${singlePlayData[0].first}+${singlePlayData[0].second}=?</b>`, m.build(
      [
        m.cbb("❌ Отмена", "cancel")
      ]
    ), message => msgId = message.message_id)

    await users.updateOne({ userId }, {
      $set: {
        singlePlayData,
        lastSinglePlayQuestion: 0,
        successAnswers: 0,
        history: [msgId],
        startTime: Date.now()
      }
    })

    ctx.scene.enter("start_singleplay")
  }, () => basicFailCallback(ctx))
})

client.connect(err => {
  if (err) console.log(err)

  global.users = client.db(dbName).collection("users")
  global.bot = bot

  bot.launch()
})