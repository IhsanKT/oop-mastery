export default [
  {
    id: 'memory-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'What does RAII (Resource Acquisition Is Initialization) mean?',
    options: [
      { text: 'A resource is acquired in an object\'s constructor and released in its destructor, so cleanup follows the object\'s lifetime on every exit path.', correct: true, why: 'Right. Scope exit, `return` and exceptions all run destructors, so the release cannot be forgotten.' },
      { text: 'Resources are acquired lazily, the first time they are used.', correct: false, why: 'RAII is about tying release to scope, not about when you acquire.' },
      { text: 'A garbage collector periodically frees unused resources.', correct: false, why: 'RAII is deterministic and needs no collector: release happens exactly at the end of the lifetime.' },
      { text: 'All resources must be created in `main` before any other code runs.', correct: false, why: 'RAII objects can be created anywhere; what matters is that an object owns the resource.' },
    ],
    explanation: `RAII makes correct cleanup the default. \`std::lock_guard\`, \`std::ifstream\` and smart pointers all work this way. Python's \`with\` statement and context managers give the same guarantee explicitly.`,
  },
  {
    id: 'memory-q02', lang: 'cpp', type: 'output', difficulty: 1,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <memory>

struct Res {
    Res() { std::cout << "Res "; }
    ~Res() { std::cout << "~Res "; }
};

int main() {
    std::cout << "start ";
    {
        auto p = std::make_unique<Res>();
        std::cout << "in ";
    }
    std::cout << "end\\n";
}`,
    options: [
      { text: 'start Res in ~Res end', correct: true, why: 'The `unique_ptr` destroys its `Res` when the inner scope ends, before `end` is printed.' },
      { text: 'start Res in end ~Res', correct: false, why: 'The object does not live to the end of `main`; `p` goes out of scope at the closing brace of the inner block.' },
      { text: 'start in end', correct: false, why: '`make_unique` constructs a `Res`, so its constructor and destructor messages appear.' },
      { text: 'start Res in end', correct: false, why: 'The destructor still runs at scope exit; a smart pointer never skips it.' },
    ],
    explanation: `A \`unique_ptr\` owns its object and deletes it in its own destructor. Because the pointer is a local variable, leaving its scope destroys it, which destroys the \`Res\`. That scope-bound cleanup is RAII.`,
  },
  {
    id: 'memory-q03', lang: 'cpp', type: 'bug', difficulty: 1,
    prompt: 'This code does not compile. Why?',
    codeLang: 'cpp',
    code: `auto a = std::make_unique<int>(5);
auto b = a;`,
    options: [
      { text: '`unique_ptr` is move-only: its copy constructor is deleted, since two owners would both delete the object. Use `std::move(a)` to transfer ownership.', correct: true, why: 'Right. Unique ownership means copying is forbidden; moving transfers it.' },
      { text: '`make_unique<int>` cannot be used with `int`.', correct: false, why: '`make_unique` works for any type, including `int`.' },
      { text: '`auto` cannot deduce the type of a smart pointer.', correct: false, why: '`auto` deduces `std::unique_ptr<int>` without problems; the failing part is the copy.' },
      { text: 'The pointer must be dereferenced with `*a` before it can be copied.', correct: false, why: 'Dereferencing gives the `int`, not a new pointer; copying the pointer itself is what is not allowed.' },
    ],
    explanation: `\`std::unique_ptr\` models sole ownership, so its copy operations are \`= delete\`. \`auto b = std::move(a);\` transfers ownership and leaves \`a\` null. If you need several owners, \`std::shared_ptr\` is the tool; if you only need to look at the object, pass a reference or raw non-owning pointer.`,
  },
  {
    id: 'memory-q04', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <memory>

int main() {
    auto a = std::make_shared<int>(5);
    std::cout << a.use_count() << " ";
    {
        auto b = a;
        std::cout << a.use_count() << " ";
    }
    std::cout << a.use_count() << "\\n";
}`,
    options: [
      { text: '1 2 1', correct: true, why: 'Copying the `shared_ptr` adds an owner (2); when `b` leaves its scope the count drops back to 1.' },
      { text: '1 1 1', correct: false, why: 'Copying a `shared_ptr` increments the shared count rather than creating a separate object.' },
      { text: '1 2 2', correct: false, why: '`b` is destroyed at the closing brace of the inner block, which decrements the count.' },
      { text: '1 2 0', correct: false, why: '`a` still owns the object, so the count cannot reach 0 while `a` is alive.' },
    ],
    explanation: `A \`shared_ptr\` has a control block holding a reference count. Every copy increments it and every destruction decrements it; the object is deleted when the count hits 0. Here \`a\` stays alive, so the count returns to 1.`,
  },
  {
    id: 'memory-q05', lang: 'cpp', type: 'concept', difficulty: 3,
    prompt: 'A `Parent` holds a `shared_ptr<Child>` and the `Child` holds a `shared_ptr<Parent>`. Both are created with `make_shared` and then go out of scope. What happens, and what is the fix?',
    options: [
      { text: 'Neither destructor runs: each object keeps the other\'s count above zero (a leak). Make the back-pointer a `weak_ptr`.', correct: true, why: 'Right. Cyclic ownership never reaches zero; `weak_ptr` observes without owning.' },
      { text: 'Both are destroyed normally; `shared_ptr` detects cycles automatically.', correct: false, why: '`shared_ptr` uses plain reference counting and cannot detect cycles; that is Python\'s extra cyclic GC.' },
      { text: 'The program crashes with a double delete.', correct: false, why: 'Nothing is deleted at all, so it is a silent leak, not a double delete.' },
      { text: 'Only the `Parent` is leaked, because children are always owned by their parent.', correct: false, why: 'Both counts stay at 1 from the other\'s pointer, so both are leaked.' },
    ],
    explanation: `Each \`shared_ptr\` keeps its target alive. When the last outside owner disappears, the two objects still hold one count each on the other, so neither reaches zero. Break cycles by making the non-owning direction (usually the child's pointer to its parent) a \`std::weak_ptr\`; use \`lock()\` to obtain a temporary \`shared_ptr\` when needed.`,
  },
  {
    id: 'memory-q06', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What does `weak_ptr::lock()` return when the object it observes has already been destroyed?',
    options: [
      { text: 'An empty `shared_ptr` (which tests as false), so you should check it before use.', correct: true, why: 'Right. `lock()` is the safe way to observe: it either gives a valid owner or an empty pointer.' },
      { text: 'A dangling `shared_ptr` that points to freed memory.', correct: false, why: 'Avoiding dangling pointers is the whole purpose of `weak_ptr`; `lock()` never returns a dangling one.' },
      { text: 'It throws `std::bad_alloc`.', correct: false, why: '`lock()` does not throw; the exception `bad_weak_ptr` comes from constructing a `shared_ptr` from an expired `weak_ptr`.' },
      { text: 'A `unique_ptr` taking over the memory.', correct: false, why: '`lock()` produces a `shared_ptr`; it never gives sole ownership.' },
    ],
    explanation: `\`weak_ptr\` knows whether the object is alive through the control block. \`lock()\` atomically returns a \`shared_ptr\` that keeps the object alive while you use it, or an empty one if the object is gone. Write \`if (auto sp = wp.lock()) { ... }\`.`,
  },
  {
    id: 'memory-q07', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Given `auto s = std::make_shared<int>(1); std::weak_ptr<int> w = s;`, what do `w.expired()` return before and after `s.reset()`?',
    options: [
      { text: '`false` before, `true` after: the only owner released the object.', correct: true, why: 'Right. A `weak_ptr` does not own, so `s.reset()` drops the count to zero and destroys the int.' },
      { text: '`false` both times, because `w` keeps the object alive.', correct: false, why: 'A `weak_ptr` does not contribute to the owner count; that is its point.' },
      { text: '`true` both times, since `weak_ptr` is always expired.', correct: false, why: 'While an owner exists, `expired()` is `false`.' },
      { text: '`true` before and `false` after.', correct: false, why: 'This is backwards: it expires only when the last `shared_ptr` is gone.' },
    ],
    explanation: `\`expired()\` is \`true\` when \`use_count()\` is zero. \`reset()\` releases \`s\`'s ownership; with no other \`shared_ptr\` owners the object is destroyed and \`w\` expires, while the control block stays alive until the last \`weak_ptr\` is gone.`,
  },
  {
    id: 'memory-q08', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Why is `std::make_unique<T>(args)` preferred over `std::unique_ptr<T>(new T(args))`?',
    options: [
      { text: 'It never exposes a naked `new`, and avoids leaks in expressions where another argument may throw between the allocation and the smart pointer\'s construction.', correct: true, why: 'Right. It also names the type once and reads more clearly.' },
      { text: 'It allocates on the stack, which is faster than the heap.', correct: false, why: '`make_unique` still allocates on the heap; it is a helper wrapping `new`.' },
      { text: 'It allows the pointer to be copied.', correct: false, why: 'The result is still a move-only `unique_ptr`.' },
      { text: 'It is the only way to give a `unique_ptr` a custom deleter.', correct: false, why: 'Custom deleters are supplied by constructing `unique_ptr<T, D>` directly; `make_unique` does not support them.' },
    ],
    explanation: `\`make_unique\` (and \`make_shared\`) wrap the allocation and the ownership transfer into one call, removing the raw \`new\` from your code. \`make_shared\` additionally allocates the object and its control block together, which is cheaper than \`shared_ptr<T>(new T)\`.`,
  },
  {
    id: 'memory-q09', lang: 'both', type: 'compare', difficulty: 3,
    prompt: 'How does `std::shared_ptr` reference counting differ from CPython\'s reference counting?',
    options: [
      { text: '`shared_ptr` counts only the owners you opt into by using `shared_ptr` (and cycles leak); CPython counts every reference to every object automatically and adds a cyclic GC.', correct: true, why: 'Right. C++ ownership is opt-in per object, while in Python every object is reference counted.' },
      { text: 'They are identical: both languages count all references and collect cycles.', correct: false, why: 'C++ has no cycle collector, and plain pointers or references are not counted at all.' },
      { text: '`shared_ptr` is handled by a background collector thread; Python frees objects immediately.', correct: false, why: '`shared_ptr` frees synchronously when the count reaches zero; no collector thread is involved.' },
      { text: 'Python only counts references to lists and dictionaries.', correct: false, why: 'Every Python object carries a reference count.' },
    ],
    explanation: `In C++ you choose per object whether ownership is shared; only \`shared_ptr\` copies are counted, and cycles are your problem (\`weak_ptr\`). In CPython every object has a count adjusted automatically, and a separate cycle detector reclaims unreachable cycles.`,
  },
  {
    id: 'memory-q10', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'After `a = [1, 2]; b = a; del a`, what is true?',
    options: [
      { text: 'The list still exists and is reachable through `b`; `del a` only removed the name `a`.', correct: true, why: 'Right. `del` unbinds a name; the object is freed only when no references remain.' },
      { text: 'The list is destroyed immediately and `b` is now invalid.', correct: false, why: 'Objects are destroyed when their reference count hits zero, and `b` still holds a reference.' },
      { text: '`b` becomes `None`.', correct: false, why: '`del a` has no effect on the name `b` or its value.' },
      { text: '`del a` raises `TypeError` because `b` still refers to it.', correct: false, why: '`del` works on names regardless of other references.' },
    ],
    explanation: `Python variables are names bound to objects. \`del a\` removes the binding of \`a\` and decrements the object's reference count. The list survives while \`b\` (or anything else) refers to it; in CPython it is freed the moment the last reference disappears.`,
  },
  {
    id: 'memory-q11', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'After `r = weakref.ref(obj)` and then `del obj` (the only strong reference), what does `r()` return in CPython?',
    options: [
      { text: '`None`: the object was freed when its last strong reference went away, and a dead weak reference returns `None`.', correct: true, why: 'Right. Weak references do not keep objects alive and report death with `None`.' },
      { text: 'The object itself, because a weak reference keeps it alive.', correct: false, why: 'Keeping alive is what strong references do; weak ones explicitly do not.' },
      { text: 'It raises `ReferenceError`.', correct: false, why: 'Calling a dead `weakref.ref` returns `None`; `ReferenceError` is raised by weak *proxies*.' },
      { text: 'A copy of the object.', correct: false, why: 'Weak references never copy; they return the original object or `None`.' },
    ],
    explanation: `A \`weakref.ref\` is a handle that does not count toward the object's reference count. Call it to get the object, or \`None\` if it has been collected. This is how caches (\`WeakValueDictionary\`) and observers avoid keeping their targets alive forever.`,
  },
  {
    id: 'memory-q12', lang: 'python', type: 'concept', difficulty: 3,
    prompt: 'What happens to an exception raised inside a `with` block if the context manager\'s `__exit__` returns `True`?',
    options: [
      { text: 'The exception is suppressed and execution continues after the `with` statement.', correct: true, why: 'Right. A truthy return value from `__exit__` tells Python the exception was handled.' },
      { text: 'The exception is re-raised after `__exit__` finishes.', correct: false, why: 'Re-raising is what happens when `__exit__` returns a false value (`None` or `False`).' },
      { text: 'The program terminates immediately.', correct: false, why: 'Termination only occurs if the exception goes unhandled; here it is swallowed.' },
      { text: 'Python raises a second exception complaining about the return value.', correct: false, why: 'Returning `True` is the documented way to suppress exceptions.' },
    ],
    explanation: `\`__exit__(self, exc_type, exc, tb)\` runs whether or not the body raised. If it returns a truthy value, the exception is swallowed; otherwise it propagates. Only suppress deliberately and specifically (\`contextlib.suppress\` is a ready-made version).`,
  },
  {
    id: 'memory-q13', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `from contextlib import contextmanager

@contextmanager
def cm():
    print("setup")
    try:
        yield
    finally:
        print("teardown")

with cm():
    print("body")
print("after")`,
    options: [
      { text: 'setup\nbody\nteardown\nafter', correct: true, why: 'Code before `yield` is the enter step, the `with` body runs at the `yield`, and the `finally` is the exit step.' },
      { text: 'setup\nteardown\nbody\nafter', correct: false, why: 'Teardown happens after the body finishes, not before it.' },
      { text: 'body\nsetup\nteardown\nafter', correct: false, why: 'Setup runs before the body, when the `with` statement is entered.' },
      { text: 'setup\nbody\nafter\nteardown', correct: false, why: 'Teardown runs when the `with` block ends, before the next statement.' },
    ],
    explanation: `A generator decorated with \`@contextmanager\` is split at \`yield\`: \`__enter__\` runs the code up to the yield, the \`with\` body runs, and \`__exit__\` resumes the generator after the yield. Put the teardown in \`finally\` so it runs even when the body raises.`,
  },
  {
    id: 'memory-q14', lang: 'cpp', type: 'bug', difficulty: 3,
    prompt: 'What is wrong with this function?',
    codeLang: 'cpp',
    code: `const std::string& label() {
    std::string s = "item-" + std::to_string(42);
    return s;
}`,
    options: [
      { text: 'It returns a reference to a local variable that is destroyed when the function returns, so the caller gets a dangling reference (undefined behavior).', correct: true, why: 'Right. Local objects die at the closing brace; a reference to one cannot outlive it.' },
      { text: 'Strings cannot be returned by reference.', correct: false, why: 'Returning a reference is fine for objects that outlive the call (members, statics); it is this local that is the problem.' },
      { text: 'It leaks memory because `s` is never deleted.', correct: false, why: '`s` is an automatic variable cleaned up by its destructor; the issue is use after destruction, not a leak.' },
      { text: '`std::to_string` returns a pointer that dangles.', correct: false, why: '`std::to_string` returns a `std::string` by value; there is no pointer involved.' },
    ],
    explanation: `A local variable lives only until its scope ends. Returning \`s\` by reference hands back a name for destroyed storage. Return by value instead (\`std::string label()\`): moves and guaranteed elision make that cheap, and nobody can dangle.`,
  },
  {
    id: 'memory-q15', lang: 'cpp', type: 'concept', difficulty: 3,
    prompt: 'What does a signature like `void take(std::unique_ptr<Widget> w);` communicate?',
    options: [
      { text: 'The function takes ownership: callers must pass `std::move(p)` (or a temporary), and `w` is destroyed at the end of `take` unless it is passed on.', correct: true, why: 'Right. A by-value `unique_ptr` is a "sink" parameter.' },
      { text: 'The function only borrows the object and the caller keeps ownership.', correct: false, why: 'Borrowing is expressed with `Widget&`, `const Widget&` or `Widget*`; passing a `unique_ptr` by value transfers ownership.' },
      { text: 'The function receives a copy of the pointer and the caller still owns the object.', correct: false, why: '`unique_ptr` cannot be copied, so the call would not compile with an lvalue.' },
      { text: 'The function shares ownership with the caller.', correct: false, why: 'Shared ownership requires `shared_ptr`.' },
    ],
    explanation: `Ownership is part of the interface. \`T&\`/\`T*\`: borrow. \`std::unique_ptr<T>\` by value: take ownership (the caller writes \`take(std::move(p))\`). \`std::shared_ptr<T>\`: share. Making this visible in the signature is a major benefit of smart pointers over raw owning pointers.`,
  },
];
