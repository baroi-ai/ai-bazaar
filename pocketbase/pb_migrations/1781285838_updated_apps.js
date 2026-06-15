/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_923867626")

  // update field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "select2701932930",
    "maxSelect": 7,
    "name": "platforms",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "ALL",
      "Web",
      "Windows",
      "Mac OS",
      "Linux",
      "Android",
      "IOS"
    ]
  }))

  // update field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3292755704",
    "help": "",
    "hidden": false,
    "id": "relation24076536",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "categoies",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // update field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "select105650625",
    "maxSelect": 6,
    "name": "category",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "image",
      "video",
      "text",
      "audio",
      "tts",
      "llm",
      "bg-remover",
      "vision"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_923867626")

  // update field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "select2701932930",
    "maxSelect": 7,
    "name": "platforms",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "ALL",
      "Web",
      "Windows",
      "Mac OS",
      "Linux",
      "Android",
      "IOS"
    ]
  }))

  // update field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3292755704",
    "help": "",
    "hidden": false,
    "id": "relation24076536",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "categoies",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // update field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "select105650625",
    "maxSelect": 6,
    "name": "category",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "image",
      "video",
      "text",
      "audio",
      "tts",
      "llm",
      "bg-remover",
      "vision"
    ]
  }))

  return app.save(collection)
})
