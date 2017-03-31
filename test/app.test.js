/* global beforeEach, describe, it, expect */

import { app, h } from "../src"
import { expectHTMLToBe } from "./util"

beforeEach(() => document.body.innerHTML = "")

describe("app", () => {
  it("boots on DOMContentLoaded", done => {
    Object.defineProperty(document, "readyState", {
      writable: true
    })

    window.document.readyState = "loading"

    app({
      model: "foo",
      subscriptions: [
        model => {
          expect(model).toEqual("foo")
          done()
        }
      ]
    })

    window.document.readyState = "complete"

    const event = document.createEvent("Event")
    event.initEvent("DOMContentLoaded", true, true)
    window.document.dispatchEvent(event)
  })

  describe("model", () => {
    it("renders a model", () => {
      app({
        model: "foo",
        view: model => h("div", {}, model)
      })

      expectHTMLToBe(`
				<div>
					foo
				</div>
			`)
    })

    it("renders a model with a loop", () => {
      app({
        model: ["foo", "bar", "baz"],
        view: model => h("ul", {}, model.map(i => h("li", {}, i)))
      })

      expectHTMLToBe(`
        <ul>
          <li>foo</li>
          <li>bar</li>
          <li>baz</li>
        </ul>
			`)
    })

    it("creates an svg element", () => {
      app({
        view: _ => h("svg", { id: "foo" }, "bar")
      })

      const elm = document.getElementById("foo")
      expect(elm.namespaceURI).toBe("http://www.w3.org/2000/svg")
    })

    it("creates svg elements recursively", () => {
      const SVG_NS = "http://www.w3.org/2000/svg"

      app({
        view: _ => h("div", {}, [
          h("p", { id: "foo" }, "foo"),
          h("svg", { id: "bar" }, [
            h("quux", {}, [
              h("beep", {}, [
                h("ping", {}),
                h("pong", {})
              ]),
              h("bop", {}),
              h("boop", {}, [
                h("ping", {}),
                h("pong", {})
              ])
            ]),
            h("xuuq", {}, [
              h("beep", {}),
              h("bop", {}, [
                h("ping", {}),
                h("pong", {})
              ]),
              h("boop", {})
            ])
          ]),
          h("p", { id: "baz" }, "baz")
        ])
      })

      expect(document.getElementById("foo").namespaceURI).not.toBe(SVG_NS)
      expect(document.getElementById("baz").namespaceURI).not.toBe(SVG_NS)

      const svg = document.getElementById("bar")
      expect(svg.namespaceURI).toBe(SVG_NS)
      expectChildren(svg)

      function expectChildren(svgElement) {
        Array.from(svgElement.childNodes).forEach(node =>
          expectChildren(node, expect(node.namespaceURI).toBe(SVG_NS)))
      }
    })

    it("can render conditionally / ignores bool/null children", () => {
      app({
        view: _ => h("div", {},
          h("h1", {}, true),
          h("h2", {}, false),
          h("h3", {}, null)
        )
      })

      expectHTMLToBe(`
        <div>
          <h1></h1>
          <h2></h2>
          <h3></h3>
        </div>
			`)
    })
  })

  describe("view", () => {
    it("embeds view in the document.body if no root is given", () => {
      app({ view: _ => "foo" })
      expect(document.body.innerHTML).toBe("foo")
    })

    it("can use inline styles", () => {
      app({
        view: model => h("div", {
          id: "foo",
          style: {
            backgroundColor: "red"
          }
        }, "foo")
      })

      expectHTMLToBe(`
        <div id="foo" style="background-color: red;">
          foo
        </div>
			`)
    })

    it("won't crash if data is null/undefined", () => {
      app({
        view: model => h("div", null, [
          h("div", undefined, "foo")
        ])
      })

      expectHTMLToBe(`
        <div>
          <div>
            foo
          </div>
        </div>
			`)
    })

    it("toggles class attributes", () => {
      app({
        model: true,
        view: model => h("div", model ? { class: "foo" } : {}, "bar"),
        actions: {
          toggle: model => !model
        },
        subscriptions: [
          (_, actions) => {
            expectHTMLToBe(`
              <div class="foo">
                bar
              </div>
						`)

            actions.toggle()

            expectHTMLToBe(`
              <div>
                bar
              </div>
						`)
          }
        ]
      })
    })

    it("updates/removes element data", () => {
      app({
        model: false,
        view: model => h("div", model
          ?
          {
            id: "xuuq",
            foo: true,
            style: {
              width: "100px",
              height: "200px"
            }
          }
          :
          {
            id: "quux",
            class: "foo",
            style: {
              color: "red",
              height: "100px"
            },
            foo: true,
            baz: false
          }, "bar"
        ),
        actions: {
          toggle: model => !model
        },
        subscriptions: [
          (_, actions) => {
            expectHTMLToBe(`
              <div id="quux" class="foo" style="color: red; height: 100px;" foo="true">
                bar
              </div>
						`)

            actions.toggle()

            expectHTMLToBe(`
              <div id="xuuq" style="height: 200px; width: 100px;" foo="true">
                bar
              </div>
						`)
          }
        ]
      })
    })

    it("keeps selectionStart and selectionEnd properties on text inputs intact on update", () => {
      app({
        model: "foo",
        actions: {
          setText: model => "bar"
        },
        view: model => h("input", { id: "foo", value: model }),
        subscriptions: [
          (_, actions) => {
            const input = document.getElementById("foo")

            expect(input.selectionStart).toBe(0)
            expect(input.selectionEnd).toBe(0)

            input.setSelectionRange(2, 2)

            actions.setText()

            expect(input.selectionStart).toBe(2)
            expect(input.selectionEnd).toBe(2)
          }
        ]
      })
    })

    it("removes node/s when a container's number of children is different", () => {
      app({
        model: true,
        actions: {
          toggle: model => !model
        },
        view: model => model
          ? h("div", {}, h("h1", {}, "foo"), h("h2", {}, "bar"))
          : h("div", {}, h("h1", {}, "foo")),
        subscriptions: [(_, actions) => actions.toggle()]
      })

      expectHTMLToBe(`
        <div>
          <h1>foo</h1>
        </div>
			`)
    })
  })

  describe("actions", () => {
    it("returns a new model to update the view", () => {
      app({
        model: 1,
        view: model => h("div", {}, model),
        actions: {
          add: model => model + 1
        },
        subscriptions: [
          (_, actions) => actions.add()
        ]
      })

      expectHTMLToBe(`
        <div>
          2
        </div>
      `)
    })

    it("updates the view asynchronously", done => {
      app({
        model: 1,
        view: model => h("div", {}, model),
        actions: {
          change: (model, data) => model + data,
          delayAndChange: (model, data, actions) => {
            setTimeout(_ => {
              actions.change(data)

              expectHTMLToBe(`
                <div>
                  ${model + data}
                </div>
              `)

              done()
            }, 20)
          }
        },
        subscriptions: [
          (_, actions) => actions.delayAndChange(10)
        ]
      })
    })

    it("returns a promise to be .then() chained", done => {
      app({
        model: 1,
        view: model => h("div", {}, model),
        actions: {
          change: (model, data) => model + data,
          delay: _ => new Promise(resolve => setTimeout(_ => resolve(), 20)),
          delayAndChange: (model, data, actions) => {
            actions.delay().then(_ => {
              actions.change(data)

              expectHTMLToBe(`
                <div>
                  ${model + data}
                </div>
              `)

              done()
            })
          }
        },
        subscriptions: [
          (_, actions) => actions.delayAndChange(10)
        ]
      })
    })

    it("collects actions by namespace/key", () => {
      app({
        model: true,
        actions: {
          foo: {
            bar: {
              baz: (model, data) => {
                expect(model).toBe(true)
                expect(data).toBe("foo.bar.baz")
              }
            }
          }
        },
        subscriptions: [
          (_, actions) => actions.foo.bar.baz("foo.bar.baz")
        ],
        view: _ => h("div", {}, "")
      })
    })
  })

  describe("hooks", () => {
    it("calls onAction/onUpdate/onRender", done => {
      app({
        view: model => h("div", {}, model),
        model: "foo",
        actions: {
          set: (_, data) => data
        },
        subscriptions: [
          (_, actions) => actions.set("bar")
        ],
        hooks: {
          onAction: (action, data) => {
            expect(action).toBe("set")
            expect(data).toBe("bar")
          },
          onUpdate: (oldModel, newModel, data) => {
            expect(oldModel).toBe("foo")
            expect(newModel).toBe("bar")
            expect(data).toBe("bar")
          },
          onRender: (model, view) => {
            if (model === "foo") {
              expect(view("bogus")).toEqual({
                tag: "div",
                data: {},
                children: ["bogus"]
              })

              return view

            } else {
              expect(model).toBe("bar")
              done()

              return view
            }
          }
        }
      })
    })

    it("calls onAction with full name for nested actions", done => {
      app({
        model: "foo",
        actions: {
          foo: {
            bar: {
              baz: {
                set: (_, data) => data
              }
            }
          }
        },
        hooks: {
          onAction: (name, data) => {
            expect(name).toBe("foo.bar.baz.set")
            expect(data).toBe("baz")
            done()
          }
        },
        subscriptions: [
          (_, actions) => actions.foo.bar.baz.set("baz")
        ]
      })
    })

    it("calls onError", done => {
      app({
        hooks: {
          onError: err => {
            expect(err).toBe("foo")
            done()
          }
        },
        subscriptions: [
          (model, actions, error) => {
            error("foo")
          }
        ]
      })
    })

    it("throw if onError hook is not given when error is called", () => {
      app({
        subscriptions: [
          (model, actions, error) => {
            try {
              error("foo")
            } catch (err) {
              expect(err).toBe("foo")
            }
          }
        ]
      })
    })

    it("allows multiple listeners on the same hook", () => {
      let count = 0

      const PluginA = _ => ({
        hooks: {
          onAction: (action, data) => {
            expect(action).toBe("foo")
            expect(data).toBe("bar")
            expect(++count).toBe(2)
          },
          onUpdate: (oldModel, newModel) => {
            expect(oldModel).toBe("foo")
            expect(newModel).toBe("foobar")
            expect(++count).toBe(5)
          }
        }
      })

      const PluginB = _ => ({
        hooks: {
          onAction: (action, data) => {
            expect(action).toBe("foo")
            expect(data).toBe("bar")
            expect(++count).toBe(3)
          },
          onUpdate: (oldModel, newModel) => {
            expect(oldModel).toBe("foo")
            expect(newModel).toBe("foobar")
            expect(++count).toBe(6)
          }
        }
      })

      app({
        model: "foo",
        plugins: [PluginA, PluginB],
        actions: {
          foo: (model, data) => model + data
        },
        hooks: {
          onAction: (action, data) => {
            expect(action).toBe("foo")
            expect(data).toBe("bar")
            expect(++count).toBe(1)
          },
          onUpdate: (oldModel, newModel) => {
            expect(oldModel).toBe("foo")
            expect(newModel).toBe("foobar")
            expect(++count).toBe(4)
          }
        },
        subscriptions: [
          (_, actions) => actions.foo("bar")
        ]
      })
    })
  })

  describe("subscriptions", () => {
    it("are called when the app starts", done => {
      app({
        subscriptions: [done]
      })
    })
  })

  describe("plugins", () => {
    it("don't spoil the model if undefined", () => {
      const Plugin = app => ({/*don't export model*/ })

      app({
        model: 1,
        view: model => h("div", {}, model),
        subscriptions: [
          model => {
            expect(model).toBe(1)
          }
        ],
        plugins: [Plugin]
      })
    })

    it("can extend the model", () => {
      const Plugin = app => ({
        model: {
          "bar": app.model.foo
        }
      })

      app({
        model: {
          foo: true
        },
        plugins: [Plugin],
        subscriptions: [
          model => {
            expect(model).toEqual({
              foo: true,
              bar: true
            })
          }
        ]
      })
    })

    it("can add new subscriptions", () => {
      const Plugin = app => ({
        subscriptions: [
          (model, actions) => {
            actions.add()
            expectHTMLToBe(`
							<div>
                3
							</div>
						`)
          }
        ]
      })

      app({
        model: 1,
        view: model => h("div", {}, model),
        actions: {
          add: model => model + 1
        },
        subscriptions: [
          (_, actions) => {
            expectHTMLToBe(`
							<div>
                1
							</div>
						`)

            actions.add()

            expectHTMLToBe(`
							<div>
                2
							</div>
						`)
          }
        ],
        plugins: [Plugin]
      })
    })

    it("can add actions", () => {
      const Plugin = app => ({
        actions: {
          foo: {
            bar: {
              baz: {
                toggle: model => !model
              }
            }
          }
        }
      })

      app({
        model: true,
        view: model => h("div", {}, `${model}`),
        subscriptions: [
          (_, actions) => {
            expectHTMLToBe(`
							<div>
                true
							</div>
						`)

            actions.foo.bar.baz.toggle()

            expectHTMLToBe(`
							<div>
                false
							</div>
						`)
          }
        ],
        plugins: [Plugin]
      })
    })

    it("allow hooks to have multiple listeners", () => {
      const PluginFoo = app => ({
        hooks: {
          onRender: (model, view) => model => h("foo", {}, view(model))
        }
      })
      const PluginBar = app => ({
        hooks: {
          onRender: (model, view) => model => h("bar", {}, view(model))
        }
      })

      app({
        model: "foo",
        view: model => h("div", {}, model),
        plugins: [PluginFoo, PluginBar]
      })

      expectHTMLToBe(`
        <bar>
          <foo>
            <div>
              foo
            </div>
          </foo>
        </bar>
			`)
    })

    it("does not overwrite actions using the same namespace", () => {
      const Plugin = app => ({
        actions: {
          foo: {
            bar: {
              baz: (model, data) => {
                expect(model).toBe(true)
                expect(data).toBe("foo.bar.baz")
                return model
              }
            }
          }
        },
      })

      app({
        model: true,
        actions: {
          foo: {
            bar: {
              qux: (model, data) => {
                expect(model).toBe(true)
                expect(data).toBe("foo.bar.qux")
              }
            }
          }
        },
        subscriptions: [
          (_, actions) => actions.foo.bar.baz("foo.bar.baz"),
          (_, actions) => actions.foo.bar.qux("foo.bar.qux"),
        ],
        view: _ => h("div", {}, ""),
        plugins: [Plugin]
      })
    })
  })

  describe("root", () => {
    it("appends view to given root", () => {
      app({
        root: document.body.appendChild(document.createElement("main")),
        view: _ => h("div", {}, "foo")
      })

      expectHTMLToBe(`
				<main>
					<div>
						foo
					</div>
				</main>
			`)
    })

    it("appends view to a non-empty root", () => {
      const main = document.createElement("main")
      main.appendChild(document.createElement("span"))

      app({
        root: document.body.appendChild(main),
        view: _ => h("div", {}, "foo")
      })

      expectHTMLToBe(`
        <main>
          <span></span>
          <div>
            foo
          </div>
        </main>
      `)
    })

    it("updates view in a mutated root", () => {
      const main = document.createElement("main")

      app({
        root: document.body.appendChild(main),
        model: "foo",
        actions: {
          bar: model => "bar"
        },
        subscriptions: [
          (_, actions) => {
            expectHTMLToBe(`
              <main>
                <div>
                  foo
                </div>
              </main>
            `)

            main.insertBefore(document.createElement("header"), main.firstChild)
            main.appendChild(document.createElement("footer"))

            actions.bar()

            expectHTMLToBe(`
              <main>
                <header></header>
                <div>
                  bar
                </div>
                <footer></footer>
              </main>
            `)
          }
        ],
        view: model => h("div", {}, model)
      })
    })
  })

  describe("lifecycle methods", () => {
    it("fires onCreate", done => {
      app({
        model: 1,
        view: model => h("div", {
          onCreate: e => {
            expect(model).toBe(1)
            done()
          }
        })
      })
    })

    it("fires onUpdate", done => {
      app({
        model: 1,
        view: model => h("div", {
          onUpdate: e => {
            expect(model).toBe(2)
            done()
          }
        }),
        actions: {
          add: model => model + 1
        },
        subscriptions: [
          (_, actions) => actions.add()
        ]
      })
    })

    it("fires onRemove", done => {
      const treeA = h("ul", {},
        h("li", {}, "foo"),
        h("li", {
          onRemove: _ => {
            done()
          }
        }, "bar"))

      const treeB = h("ul", {}, h("li", {}, "foo"))

      app({
        model: true,
        view: _ => _ ? treeA : treeB,
        actions: {
          toggle: model => !model
        },
        subscriptions: [
          (_, actions) => actions.toggle()
        ]
      })
    })
  })
})
