const { Markup, Extra } = require("telegraf")
const text = "🎟 В меню"

module.exports = {
  markup: {
    full: Extra.markup(Markup.inlineKeyboard(
      [Markup.callbackButton(
        text, "menu"
      )]
    )),

    right: Markup.callbackButton("В меню 🎟", "menu"),
    left: Markup.callbackButton("🎟 В меню", "menu"),
  }
}