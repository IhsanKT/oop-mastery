export default [
  {
    id: 'memory-e01', lang: 'cpp', title: 'ResourceGuard: RAII and move-only', difficulty: 3,
    task: `Write \`class ResourceGuard\`, an RAII handle that records what it does in a static log.

- \`static std::vector<std::string>& log()\` returns one shared log (a function-local static).
- \`explicit ResourceGuard(std::string name)\` appends \`"open:<name>"\` to the log.
- The destructor appends \`"close:<name>"\`, **exactly once** per resource, even if the guard was moved.
- **Not copyable** (\`= delete\` copy constructor and copy assignment), but **movable**: after a move the moved-from guard must do nothing when destroyed. Move assignment first closes the guard's own current resource, then takes over the other one.

~~~cpp
{
    ResourceGuard a("db");          // log: open:db
    ResourceGuard b(std::move(a));  // ownership moves to b
}                                   // log: close:db  (once)
~~~`,
    starter: `#include <string>
#include <utility>
#include <vector>

class ResourceGuard {
public:
    static std::vector<std::string>& log() {
        static std::vector<std::string> l;
        return l;
    }
    explicit ResourceGuard(std::string name) {}   // TODO: log "open:<name>"
    ~ResourceGuard() {}                           // TODO: log "close:<name>"
    // TODO: delete copying, add moves
};
`,
    tests: [
      { name: 'closed at scope exit', code: `auto before = ResourceGuard::log().size();
{
    ResourceGuard a("a");
    EXPECT_EQ(ResourceGuard::log().size(), before + 1);
}
std::vector<std::string> tail(ResourceGuard::log().begin() + before, ResourceGuard::log().end());
EXPECT((tail == std::vector<std::string>{"open:a", "close:a"}));` },
      { name: 'closed when an exception unwinds the stack', code: `auto before = ResourceGuard::log().size();
try {
    ResourceGuard g("x");
    throw std::runtime_error("boom");
} catch (const std::runtime_error&) {}
std::vector<std::string> tail(ResourceGuard::log().begin() + before, ResourceGuard::log().end());
EXPECT((tail == std::vector<std::string>{"open:x", "close:x"}));` },
      { name: 'not copyable but movable', code: `EXPECT((!std::is_copy_constructible_v<ResourceGuard>));
EXPECT((!std::is_copy_assignable_v<ResourceGuard>));
EXPECT((std::is_move_constructible_v<ResourceGuard>));
EXPECT((std::is_move_assignable_v<ResourceGuard>));` },
      { name: 'closed exactly once after a move', code: `auto before = ResourceGuard::log().size();
{
    ResourceGuard a("m");
    ResourceGuard b(std::move(a));
}
std::vector<std::string> tail(ResourceGuard::log().begin() + before, ResourceGuard::log().end());
EXPECT((tail == std::vector<std::string>{"open:m", "close:m"}));` },
      { name: 'move assignment closes the old resource first', code: `auto before = ResourceGuard::log().size();
{
    ResourceGuard a("p");
    ResourceGuard b("q");
    b = std::move(a);
    std::vector<std::string> mid(ResourceGuard::log().begin() + before, ResourceGuard::log().end());
    EXPECT((mid == std::vector<std::string>{"open:p", "open:q", "close:q"}));
}
std::vector<std::string> tail(ResourceGuard::log().begin() + before, ResourceGuard::log().end());
EXPECT((tail == std::vector<std::string>{"open:p", "open:q", "close:q", "close:p"}));` },
    ],
    hints: [
      'Keep \`std::string name_\` and a \`bool active_\`. The constructor sets \`active_ = true\` and logs; the destructor logs only if \`active_\`.',
      'Delete the copy operations. The move constructor copies \`name_\` and \`active_\` from the source, then sets \`o.active_ = false\`.',
      'Move assignment: if \`this != &o\`, run the same code as the destructor (close if active), then take \`o\`\'s name and flag and deactivate \`o\`.',
    ],
    solution: `#include <string>
#include <utility>
#include <vector>

class ResourceGuard {
    std::string name_;
    bool active_;

    void release() {
        if (active_) {
            log().push_back("close:" + name_);
            active_ = false;
        }
    }
public:
    static std::vector<std::string>& log() {
        static std::vector<std::string> l;
        return l;
    }

    explicit ResourceGuard(std::string name) : name_(std::move(name)), active_(true) {
        log().push_back("open:" + name_);
    }
    ~ResourceGuard() { release(); }

    ResourceGuard(const ResourceGuard&) = delete;
    ResourceGuard& operator=(const ResourceGuard&) = delete;

    ResourceGuard(ResourceGuard&& o) noexcept : name_(std::move(o.name_)), active_(o.active_) {
        o.active_ = false;
    }
    ResourceGuard& operator=(ResourceGuard&& o) noexcept {
        if (this != &o) {
            release();
            name_ = std::move(o.name_);
            active_ = o.active_;
            o.active_ = false;
        }
        return *this;
    }
};
`,
    explanation: `**RAII.** The constructor acquires (here: logs \`open\`), the destructor releases (\`close\`). Destructors run during stack unwinding, so the resource is closed when an exception passes through, with no \`try\`/\`finally\` anywhere.

**Unique ownership.** Copying would produce two guards that each think they must close the resource, so copying is \`= delete\`d. Moving is allowed: the \`active_\` flag records who owns the resource, and the moved-from guard is deactivated so its destructor does nothing. Move assignment first releases what the target already owns (otherwise it would leak that resource), then takes over.

This is exactly the shape of \`std::unique_ptr\`, \`std::lock_guard\`-like handles and file streams: move-only RAII owners.`,
  },
  {
    id: 'memory-e02', lang: 'cpp', title: 'A tree with shared_ptr and weak_ptr', difficulty: 3,
    task: `Build a tree where parents own children, and children only observe their parent.

- \`struct Node\` with public members \`std::string name;\`, \`std::vector<std::shared_ptr<Node>> children;\` and \`std::weak_ptr<Node> parent;\`.
- \`std::shared_ptr<Node> makeNode(std::string name)\` creates a node.
- \`void addChild(const std::shared_ptr<Node>& parent, const std::shared_ptr<Node>& child)\` appends \`child\` to \`parent->children\` and sets \`child->parent\`.
- \`std::string path(const std::shared_ptr<Node>& node)\` returns the names from the root to \`node\`, joined by \`/\` (for example \`"root/a/b"\`; for a root just its name).

Because the back-pointer is a \`weak_ptr\`, there is no ownership cycle: when the last owner of the root lets go, the whole tree is destroyed.

~~~cpp
auto root = makeNode("root");
auto a = makeNode("a");
addChild(root, a);
path(a);        // "root/a"
~~~`,
    starter: `#include <memory>
#include <string>
#include <vector>

struct Node {
    std::string name;
    std::vector<std::shared_ptr<Node>> children;
    std::weak_ptr<Node> parent;
};

std::shared_ptr<Node> makeNode(std::string name) {
    return nullptr;  // TODO
}

void addChild(const std::shared_ptr<Node>& parent, const std::shared_ptr<Node>& child) {
    // TODO
}

std::string path(const std::shared_ptr<Node>& node) {
    return "";  // TODO
}
`,
    tests: [
      { name: 'makeNode', code: `auto n = makeNode("root");
EXPECT(n != nullptr);
EXPECT_EQ(n->name, std::string("root"));
EXPECT(n->children.empty());
EXPECT(n->parent.expired());` },
      { name: 'addChild links both directions', code: `auto root = makeNode("root");
auto a = makeNode("a");
addChild(root, a);
EXPECT_EQ(root->children.size(), std::size_t(1));
EXPECT(root->children[0] == a);
EXPECT(a->parent.lock() == root);
EXPECT((std::is_same_v<decltype(Node::parent), std::weak_ptr<Node>>));` },
      { name: 'path joins names from the root', code: `auto root = makeNode("root");
auto a = makeNode("a");
auto b = makeNode("b");
addChild(root, a);
addChild(a, b);
EXPECT_EQ(path(root), std::string("root"));
EXPECT_EQ(path(a), std::string("root/a"));
EXPECT_EQ(path(b), std::string("root/a/b"));` },
      { name: 'the tree is destroyed when the root owner lets go', code: `auto root = makeNode("root");
auto child = makeNode("c");
addChild(root, child);
std::weak_ptr<Node> wr = root;
std::weak_ptr<Node> wc = child;
child.reset();
EXPECT(!wc.expired());   // still owned by root
EXPECT_EQ(root.use_count(), 1);
root.reset();
EXPECT(wr.expired());    // no cycle keeps the root alive
EXPECT(wc.expired());` },
    ],
    hints: [
      '\`makeNode\` is \`return std::make_shared<Node>();\` followed by setting the name (or use aggregate initialization).',
      '\`addChild\`: \`parent->children.push_back(child); child->parent = parent;\`. Assigning a \`shared_ptr\` to a \`weak_ptr\` does not increase the owner count.',
      '\`path\` can be recursive: lock the parent with \`node->parent.lock()\`; if it is empty return \`node->name\`, otherwise \`path(parent) + "/" + node->name\`.',
    ],
    solution: `#include <memory>
#include <string>
#include <vector>

struct Node {
    std::string name;
    std::vector<std::shared_ptr<Node>> children;
    std::weak_ptr<Node> parent;
};

std::shared_ptr<Node> makeNode(std::string name) {
    auto n = std::make_shared<Node>();
    n->name = std::move(name);
    return n;
}

void addChild(const std::shared_ptr<Node>& parent, const std::shared_ptr<Node>& child) {
    parent->children.push_back(child);
    child->parent = parent;      // weak: no ownership
}

std::string path(const std::shared_ptr<Node>& node) {
    if (auto p = node->parent.lock()) return path(p) + "/" + node->name;
    return node->name;
}
`,
    explanation: `**Owning down, observing up.** A parent *owns* its children through \`shared_ptr\`, but a child only *observes* its parent through \`weak_ptr\`. If both directions were \`shared_ptr\`, each node would keep the other alive and nothing would ever be freed (a reference cycle).

**\`lock()\` for safe access.** \`path\` calls \`node->parent.lock()\`, which returns a temporary \`shared_ptr\` while the parent exists, or an empty one for a root. The recursion then walks up to the root. When the last owner of the root is reset, the root's count reaches zero, its \`children\` vector is destroyed, and the children's counts drop to zero too: the whole tree disappears.`,
  },
  {
    id: 'memory-e03', lang: 'python', title: 'A weak-value cache', difficulty: 3,
    task: `Write \`class Cache\` backed by \`weakref.WeakValueDictionary\`.

- \`get_or_create(key, factory)\` returns the cached object for \`key\` if it is still alive; otherwise it calls \`factory()\`, stores the result and returns it. The factory must be called **only** when there is no live object.
- \`__len__\` returns the number of entries still alive, and \`__contains__(key)\` tells whether \`key\` has a live entry.
- The cache must **not** keep objects alive: once the last outside reference is gone, the entry disappears.

~~~python
cache = Cache()
a = cache.get_or_create("k", Thing)
b = cache.get_or_create("k", Thing)   # a is b -> True, Thing() called once
del a, b
"k" in cache                          # False
~~~`,
    starter: `import weakref


class Cache:
    def __init__(self):
        self._items = {}   # TODO: use weakref.WeakValueDictionary()

    def get_or_create(self, key, factory):
        raise NotImplementedError

    def __len__(self):
        return len(self._items)

    def __contains__(self, key):
        return key in self._items
`,
    tests: [
      { name: 'the same object is returned while it is alive', code: `class Thing: pass
calls = []
def factory():
    calls.append(1)
    return Thing()
cache = Cache()
a = cache.get_or_create("k", factory)
b = cache.get_or_create("k", factory)
assert a is b
assert len(calls) == 1, "factory must be called only once"
assert "k" in cache and len(cache) == 1` },
      { name: 'different keys give different objects', code: `class Thing: pass
cache = Cache()
a = cache.get_or_create("a", Thing)
b = cache.get_or_create("b", Thing)
assert a is not b
assert len(cache) == 2` },
      { name: 'entries disappear after the last reference is deleted', code: `import gc
class Thing: pass
cache = Cache()
a = cache.get_or_create("k", Thing)
assert "k" in cache
del a
gc.collect()
assert "k" not in cache, "the cache must not keep the object alive"
assert len(cache) == 0` },
      { name: 'a dead entry is recreated by the factory', code: `import gc
class Thing: pass
calls = []
def factory():
    calls.append(1)
    return Thing()
cache = Cache()
a = cache.get_or_create("k", factory)
del a
gc.collect()
b = cache.get_or_create("k", factory)
assert len(calls) == 2
assert "k" in cache
assert isinstance(cache._items, __import__("weakref").WeakValueDictionary)` },
    ],
    hints: [
      'Replace the plain dict with \`weakref.WeakValueDictionary()\`: its values are held weakly.',
      'In \`get_or_create\`: \`obj = self._items.get(key)\`; if \`obj is None\`, create it with \`factory()\` and store it.',
      'Do not write \`if key in d: return d[key]\`: the entry may vanish between the two lookups. Fetch once with \`get\`.',
    ],
    solution: `import weakref


class Cache:
    def __init__(self):
        self._items = weakref.WeakValueDictionary()

    def get_or_create(self, key, factory):
        obj = self._items.get(key)
        if obj is None:
            obj = factory()
            self._items[key] = obj
        return obj

    def __len__(self):
        return len(self._items)

    def __contains__(self, key):
        return key in self._items
`,
    explanation: `**Weak references.** A \`WeakValueDictionary\` stores its values through weak references, so the cache does not count as an owner. As soon as the last strong reference elsewhere disappears, CPython frees the object (reference count zero) and the dictionary drops the entry by itself. The cache is therefore a *lookup* aid, not a keep-alive.

**One lookup.** \`get_or_create\` fetches once with \`.get(key)\` and tests for \`None\`; checking \`key in d\` first and then indexing would race with garbage collection, because the entry can vanish between the two steps. The same idea in C++ is a \`std::map<Key, std::weak_ptr<T>>\` plus \`lock()\`.`,
  },
  {
    id: 'memory-e04', lang: 'python', title: 'Transactions as context managers', difficulty: 3,
    task: `Write two equivalent context managers that record what happens in a list.

- \`class Transaction(log)\`: \`__enter__\` appends \`"begin"\` to \`log\`. \`__exit__\` appends \`"commit"\` if the body succeeded or \`"rollback"\` if it raised, and **does not suppress** the exception (it is re-raised to the caller).
- \`transaction(log)\`: a generator decorated with \`@contextmanager\` that behaves identically (\`"begin"\`, then \`"commit"\` or \`"rollback"\`, exception propagates).

~~~python
log = []
with Transaction(log):
    pass                  # log == ["begin", "commit"]

try:
    with transaction(log):
        raise ValueError("boom")
except ValueError:
    pass                  # log ends with "begin", "rollback"
~~~`,
    starter: `from contextlib import contextmanager


class Transaction:
    def __init__(self, log):
        self.log = log

    def __enter__(self):
        raise NotImplementedError

    def __exit__(self, exc_type, exc, tb):
        raise NotImplementedError


@contextmanager
def transaction(log):
    raise NotImplementedError
    yield
`,
    tests: [
      { name: 'class: commit on success', code: `log = []
with Transaction(log):
    log.append("work")
assert log == ["begin", "work", "commit"], log` },
      { name: 'class: rollback on error and the error propagates', code: `log = []
try:
    with Transaction(log):
        raise ValueError("boom")
    assert False, "the exception must propagate"
except ValueError as e:
    assert str(e) == "boom"
assert log == ["begin", "rollback"], log` },
      { name: 'generator: commit on success', code: `log = []
with transaction(log):
    log.append("work")
assert log == ["begin", "work", "commit"], log` },
      { name: 'generator: rollback on error and the error propagates', code: `log = []
try:
    with transaction(log):
        raise KeyError("k")
    assert False, "the exception must propagate"
except KeyError:
    pass
assert log == ["begin", "rollback"], log
log2 = []
with transaction(log2):
    pass
assert log2 == ["begin", "commit"], log2` },
    ],
    hints: [
      'In the class, \`__enter__\` logs \`"begin"\` and returns \`self\`. \`__exit__\` checks \`exc_type is None\`.',
      '\`__exit__\` must end with \`return False\` (or no return) so the exception is not swallowed.',
      'In the generator: log \`"begin"\`, then \`try: yield\`, \`except BaseException: log "rollback"; raise\`, \`else: log "commit"\`.',
    ],
    solution: `from contextlib import contextmanager


class Transaction:
    def __init__(self, log):
        self.log = log

    def __enter__(self):
        self.log.append("begin")
        return self

    def __exit__(self, exc_type, exc, tb):
        self.log.append("commit" if exc_type is None else "rollback")
        return False   # never suppress the exception


@contextmanager
def transaction(log):
    log.append("begin")
    try:
        yield
    except BaseException:
        log.append("rollback")
        raise
    else:
        log.append("commit")
`,
    explanation: `**Class-based.** Python calls \`__enter__\` when the \`with\` block starts and \`__exit__(exc_type, exc, tb)\` when it ends, on success or failure. \`exc_type\` is \`None\` on success, which lets the method choose commit or rollback. Returning a false value lets the exception continue to the caller; returning \`True\` would swallow it.

**Generator-based.** \`@contextmanager\` splits a generator at \`yield\`: the code before is \`__enter__\`, the body of \`with\` runs at the \`yield\`, and an exception from the body is *thrown into the generator at the yield*. So the \`except\` branch can roll back and \`raise\` to re-raise, and the \`else\` branch commits. Both forms are Python's RAII: cleanup is guaranteed by the language, not by caller discipline.`,
  },
];
