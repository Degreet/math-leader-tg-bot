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
        next = `Конец! Твои результаты: ${successAnswers}/5`
      } else {
        thisPlayData = singlePlayData[lastSinglePlayQuestion]
        next = `${lastSinglePlayQuestion + 1} вопрос:\n<b>
${thisPlayData.first}+${thisPlayData.second}=?</b>`
      }

      if (success) {
        msg.send(userId, `🎉 Верно! ${next}`)
      } else {
        msg.send(userId, `👎 Неверно! Верный ответ: ${result}. ${next}`)
      }

      await users.updateOne({ userId }, {
        $set: {
          lastSinglePlayQuestion,
          successAnswers
        }
      })

      ctx.scene.reenter()
    }, () => basicFailCallback(ctx))
  })

  return scene
}

const stage = new Stage([
  generateQuestionScene()
])

bot.use(session())
bot.use(stage.middleware())

/* 
  TODO: Одиночная игра

  * При попадании пользователя в одиночную игру:
    * Генерируются 5 вопросов и сохраняются в базу
      * Вопросы генерируются на примере https://codepen.io/DegreetPro/pen/oNzbxJL?editors=1010
    * Первый вопрос выводится пользователю
      * Когда пользователь дает ответ
        * Если ответ верный
          * сообщить пользователю о том, что он ответил верно
          * перейти к след. шагу
          * добавить 1 бал в бд
        * Иначе
          * сообщить пользователю о том, что он ответил неверно
          * сообщить пользователю верный результат
          * перейти к след. шагу
    * Когда кончаются вопросы
      * Вывести пользователю резултаты:
        * Пример: 1/5
*/

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
      gamesPlayed: 0
    })
  })
})

bot.action("menu", async ctx => {
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
})

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

    await users.updateOne({ userId }, {
      $set: {
        singlePlayData,
        lastSinglePlayQuestion: 0,
        successAnswers: 0
      }
    })

    msg.editLast(ctx, `📕 1 пример:\n<b>${singlePlayData[0].first}+${singlePlayData[0].second}=?</b>`, m.build(
      [
        m.cbb("❌ Отмена", "cancel")
      ]
    ))

    ctx.scene.enter("start_singleplay")
  }, () => basicFailCallback(ctx))
})

client.connect(err => {
  if (err) console.log(err)

  global.users = client.db(dbName).collection("users")
  global.bot = bot

  bot.launch()
})