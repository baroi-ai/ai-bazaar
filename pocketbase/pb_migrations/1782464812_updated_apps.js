/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_923867626")

  // remove field
  collection.fields.removeById("select105650625")

  // remove field
  collection.fields.removeById("url2776776943")

  // update field
  collection.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "select1789344215",
    "maxSelect": 0,
    "name": "execution_type",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "native_binary",
      "web_app",
      "daemon_uv"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_923867626")

  // add field
  collection.fields.addAt(11, new Field({
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

  // add field
  collection.fields.addAt(22, new Field({
    "exceptDomains": null,
    "help": "",
    "hidden": false,
    "id": "url2776776943",
    "name": "source_url",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "url"
  }))

  // update field
  collection.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "select1789344215",
    "maxSelect": 0,
    "name": "execution_type",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "native_binary",
      "web_app",
      "daemon_uv"
    ]
  }))

  return app.save(collection)
})
