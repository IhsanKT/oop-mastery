## Ownership: who deletes?

Every resource (memory, a file, a lock, a socket) must be released exactly once. With raw `new`/`delete` that duty lives in the programmer's head, and the bugs are classic: a **leak** (never released), a **double delete**, a **dangling pointer** (used after release), and the sneaky one, an **exception path** that skips the cleanup.

~~~cpp
void process() {
    Widget* w = new Widget;
    work(w);            // if this throws, the delete below never runs: leak
    delete w;
}
~~~
~~~python
def process():
    f = open("data.txt")
    work(f)             # if this raises, the file stays open until GC gets to it
    f.close()
~~~

## RAII

**RAII** (Resource Acquisition Is Initialization) ties a resource to an object's lifetime: acquire in the constructor, release in the destructor. Destructors run on every exit path, including exceptions.

~~~cpp
{
    std::lock_guard<std::mutex> lock(m);   // locks here
    std::ofstream out("log.txt");          // opens here
    work();                                // may throw: cleanup still happens
}                                          // ~ofstream closes, ~lock_guard unlocks
~~~
~~~python
with lock:                                 # acquire
    with open("log.txt", "w") as out:      # open
        work()                             # may raise: __exit__ still runs
# lock released, file closed
~~~

## `unique_ptr`: sole ownership

~~~cpp
#include <memory>
auto w = std::make_unique<Widget>(42);    // preferred over new: exception-safe, no naked new
auto w2 = std::move(w);                   // ownership transfers; w is now null
// auto w3 = w2;                          // error: unique_ptr is not copyable

void use(const Widget& w);                // borrow: the caller keeps ownership
void take(std::unique_ptr<Widget> w);     // sink: takes ownership by value
use(*w2);
take(std::move(w2));                      // w2 is empty afterwards

auto f = std::unique_ptr<std::FILE, int(*)(std::FILE*)>(std::fopen("a", "r"), std::fclose);  // custom deleter
~~~
~~~python
# Python has no unique ownership: a name is a reference, and the object
# lives as long as any reference does.
w = Widget(42)
w2 = w            # two names, one object
~~~

A `unique_ptr` is move-only. Pass `const T&` or `T*` to *use* an object; pass a `unique_ptr` by value to *take over* ownership.

## `shared_ptr` and `weak_ptr`

~~~cpp
auto a = std::make_shared<Widget>();       // one allocation: object + control block
std::cout << a.use_count();                // 1
{
    auto b = a;                            // copy: count goes to 2
    std::cout << a.use_count();            // 2
}                                          // b gone: back to 1

struct Parent; struct Child;
struct Parent { std::shared_ptr<Child> child; };
struct Child  { std::weak_ptr<Parent> parent; };   // weak: does not keep the parent alive

std::weak_ptr<Widget> w = a;
if (auto s = w.lock()) { /* alive: s is a shared_ptr */ }
a.reset();
w.expired();                               // true; w.lock() now returns an empty shared_ptr
~~~
~~~python
import weakref
class Widget: pass
a = Widget()
w = weakref.ref(a)
w() is a          # True: call the ref to get the object
del a             # removes the NAME; with no other reference the object dies
w()               # None
~~~

`shared_ptr` shares ownership through an atomic reference count, which costs memory and time; two `shared_ptr`s pointing at each other **never reach zero** (a cycle leaks). Break cycles with `weak_ptr` on the back-reference (a child's pointer to its parent). A `weak_ptr` observes without owning; `lock()` gives a temporary `shared_ptr` or an empty one if the object is gone.

> **Pitfall:** Return a reference or pointer to a local variable and you hand out a dangling reference: `const std::string& name() { std::string s = "x"; return s; }` is undefined behavior.

**Guidelines:** prefer plain values and containers; then `unique_ptr`; use `shared_ptr` only for real shared ownership; never own through a raw pointer (raw pointers and references are for borrowing).

## Python: reference counting and the cyclic GC

~~~cpp
// shared_ptr's count is explicit and per-pointer; the object dies at 0.
// In Python every object has a count, maintained automatically.
~~~
~~~python
import sys, gc
a = [1, 2]
b = a
sys.getrefcount(a)   # 3 (a, b and the temporary argument)
del a                # removes the name `a`, not the list: `b` still refers to it
b                    # [1, 2]
del b                # count reaches 0: the list is freed immediately in CPython

class Node:
    def __init__(self): self.other = None
x, y = Node(), Node()
x.other, y.other = y, x   # cycle: counts never reach 0
del x, y
gc.collect()              # the cyclic garbage collector finds and frees the pair
~~~

`del name` only unbinds a name. Reference counting frees most objects promptly, but cycles need the **cyclic GC**, which runs periodically. Use `weakref.ref` (or `WeakValueDictionary` for caches) to refer to objects without keeping them alive, and `weakref.finalize(obj, callback, ...)` to run cleanup when an object is collected. Do not rely on `__del__` for important cleanup; use a context manager.

## Context managers in depth

~~~cpp
// C++ analogue: a class whose destructor does the cleanup (RAII).
struct Timer { ~Timer() { /* report elapsed */ } };
~~~
~~~python
from contextlib import contextmanager, ExitStack

class Transaction:
    def __enter__(self):
        print("begin"); return self
    def __exit__(self, exc_type, exc, tb):   # called on success AND on exception
        print("rollback" if exc_type else "commit")
        return False                         # True would suppress the exception

@contextmanager
def transaction():
    print("begin")            # setup
    try:
        yield                 # the with-body runs here
    except Exception:
        print("rollback"); raise
    else:
        print("commit")       # teardown

with ExitStack() as stack:    # manage a dynamic number of resources
    files = [stack.enter_context(open(p)) for p in paths]
~~~

`__exit__(exc_type, exc, tb)` receives the exception (or three `None`s). Returning a truthy value **swallows** the exception; returning `False`/`None` lets it propagate. With `@contextmanager`, code before `yield` is `__enter__`, code after is `__exit__`, and exceptions are re-raised at the `yield`, so wrap it in `try`/`finally` if cleanup must always run. `ExitStack` closes everything it has entered, in reverse order.

## Key takeaways

- Every resource needs exactly one owner responsible for releasing it.
- RAII acquires in the constructor and releases in the destructor, so every exit path, including exceptions, cleans up.
- Prefer values, then `unique_ptr`, then `shared_ptr`; never own through a raw pointer.
- `unique_ptr` is move-only: pass a reference to borrow, a `unique_ptr` by value to transfer ownership.
- `shared_ptr` counts owners with `use_count`; cycles never free, so use `weak_ptr` for back-references and `lock()` to use it.
- Python frees objects by reference counting plus a cyclic GC; `del` removes a name, not an object.
- `weakref.ref` and `WeakValueDictionary` observe objects without keeping them alive.
- `with` is Python's RAII; `__exit__` returning true suppresses the exception, and `@contextmanager` splits setup, body and teardown around `yield`.

## Common pitfalls

- `new` without a matching owner: an exception between `new` and `delete` leaks.
- Copying a `unique_ptr`, or sharing one raw pointer between two `unique_ptr`s.
- A `shared_ptr` cycle (parent and child both `shared_ptr`) that never destructs.
- Returning a reference or pointer to a local variable.
- Assuming `del x` destroys the object in Python while other references exist.
- Writing `@contextmanager` cleanup after `yield` without `try`/`finally`, so it is skipped on exceptions.
