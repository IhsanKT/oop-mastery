export default [
  {
    id: 'lifetime-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'What is the main job of a constructor (a C++ constructor such as `Fraction(int, int)`, or Python\'s `__init__`)?',
    options: [
      { text: 'To establish the object\'s invariant, so it is valid from the first moment anyone can see it, or to refuse by throwing when that is impossible.', correct: true, why: 'Right. Creating an object always runs a constructor, so a class can guarantee a rule such as "the denominator is never 0" for the object\'s entire life.' },
      { text: 'To allocate the memory the object lives in, so that its data members have somewhere to be stored.', correct: false, why: 'The memory is obtained *before* the constructor runs: on the stack, by `operator new`, or by Python\'s `__new__`. The constructor turns that raw storage into a valid object.' },
      { text: 'To set every data member to zero or empty, so that every new object starts from the same predictable state.', correct: false, why: 'C++ does not zero members for you (an `int` with no initializer is indeterminate), and zero is not always valid: a denominator of 0 is not. A constructor sets *meaningful* values.' },
      { text: 'To build the new object and return it to the caller, which is why it is named after the class.', correct: false, why: 'A C++ constructor has no return type (the class name only marks it as a constructor), and Python\'s `__init__` must return `None`. The caller receives the object from the creation expression itself.' },
    ],
    explanation: `A class's **invariant** is the set of rules that make an object valid: a \`Fraction\`'s denominator is non-zero, a \`Range\` has \`lo <= hi\`. Because every way of creating an object runs a constructor, the constructor is the one place where those rules are established, and no code ever sees a half-built object.

If the arguments make a valid object impossible, the constructor should **throw** (\`std::invalid_argument\` / \`ValueError\`). Then no object exists at all, which is far better than an object in a broken state.`,
  },
  {
    id: 'lifetime-q02', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print? Note the order of the member-initializer list.',
    codeLang: 'cpp',
    code: `#include <iostream>

struct Tracer {
    explicit Tracer(const char* name) { std::cout << name << ' '; }
};

struct Pair {
    Tracer first;
    Tracer second;
    Pair() : second("second"), first("first") { std::cout << "body"; }
};

int main() { Pair p; }`,
    options: [
      { text: 'first second body', correct: true, why: 'Members are initialized in declaration order (`first`, then `second`), whatever order the list uses, and the constructor body runs last.' },
      { text: 'second first body', correct: false, why: 'The initializer list only supplies each member\'s arguments; it does not set the order. GCC\'s `-Wreorder` warns about exactly this mismatch.' },
      { text: 'body first second', correct: false, why: 'Members are never initialized after the body or lazily: when the body starts, every member already exists, so the body can use them.' },
      { text: 'Compilation error: the initializer list must follow declaration order', correct: false, why: 'Writing the list out of order is legal. It only triggers a `-Wreorder` *warning*, and the members are still built in declaration order.' },
    ],
    explanation: `Non-static data members are initialized in the order they are **declared in the class**, whatever order the member-initializer list uses; the list only says *which arguments* each member gets. GCC's \`-Wreorder\` (enabled by \`-Wall\`) warns: *'Pair::second' will be initialized after* \`first\`.

The order matters as soon as one initializer reads another member: \`Buffer(std::size_t n) : size_(n), data_(size_, 0)\` is undefined behavior if \`data_\` is declared before \`size_\`, because \`size_\` is read before it is initialized. Write lists in declaration order and keep \`-Wall\` on.`,
  },
  {
    id: 'lifetime-q03', lang: 'cpp', type: 'bug', difficulty: 2,
    prompt: "This class fails to compile with `error: uninitialized const member in 'const int'` and `error: assignment of read-only member 'Account::id_'`. What is the right fix?",
    codeLang: 'cpp',
    code: `class Account {
public:
    explicit Account(int id) {
        id_ = id;
    }
    int id() const { return id_; }
private:
    const int id_;
};`,
    options: [
      { text: 'Initialize the member in the member-initializer list: `explicit Account(int id) : id_(id) {}`', correct: true, why: 'The list *initializes* `id_` as it is created, which is exactly what a `const` member allows. The body could only assign to it afterwards, which `const` forbids.' },
      { text: 'Remove `const` from `id_`: a member cannot be `const` if its value comes from a constructor argument.', correct: false, why: 'That compiles, but it throws away the guarantee that an account\'s id never changes. `const` members are fine; they just have to be *initialized* in the list rather than assigned in the body.' },
      { text: 'Write `this->id_ = id;` so the compiler knows which `id_` is meant.', correct: false, why: 'There is no name ambiguity here. `this->id_ = id` is still an assignment to an already-initialized `const` member, so both errors remain.' },
      { text: 'Write `const_cast<int&>(id_) = id;` in the body, to lift the `const` for this one assignment.', correct: false, why: 'Modifying an object defined `const` through a `const_cast` is undefined behavior, and the "uninitialized const member" error remains, because the list still does not initialize `id_`.' },
    ],
    explanation: `A constructor runs in two phases. First every member is **initialized**: from the member-initializer list, else from its default member initializer, else by default-initialization. Then the **body** runs. A \`const\` member must get its value in the first phase, because afterwards it can never change; \`id_ = id;\` in the body is an assignment, not an initialization.

The same rule applies to reference members and to members whose type has no default constructor:

~~~cpp
explicit Account(int id) : id_(id) {}
~~~`,
  },
  {
    id: 'lifetime-q04', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <string>

struct Noisy {
    std::string name;
    explicit Noisy(std::string n) : name(n) { std::cout << "+" << name << " "; }
    ~Noisy() { std::cout << "-" << name << " "; }
};

int main() {
    Noisy a("a");
    {
        Noisy b("b");
        Noisy c("c");
    }
    Noisy d("d");
}`,
    options: [
      { text: '+a +b +c -c -b +d -d -a', correct: true, why: '`b` and `c` die at the inner closing brace, newest first. At the end of `main`, `d` (built after `a`) dies before `a`.' },
      { text: '+a +b +c +d -d -c -b -a', correct: false, why: '`b` and `c` belong to the inner block, so they are destroyed at its closing brace, before `d` is even created, not at the end of `main`.' },
      { text: '+a +b +c -b -c +d -a -d', correct: false, why: 'Destruction is last in, first out, not first in, first out: `c` was built after `b` (and might depend on it), so `c` is destroyed first. The same goes for `d` and `a`.' },
      { text: '+a +b +c -c -b +d -a -d', correct: false, why: 'The reverse rule applies in every block, including `main`: `d` was constructed after `a`, so `d` is destroyed first.' },
    ],
    explanation: `A local (automatic) object lives until the end of the **block** that declares it, and objects in the same block are destroyed in the **reverse order** of their construction. Here \`b\` and \`c\` die at the inner \`}\` (\`c\` first), then \`d\` is created, and at the end of \`main\` \`d\` dies before \`a\`.

Reverse order is what makes this safe: an object constructed later may refer to earlier ones, so it must go first. The same happens when a block is left early, by \`return\` or by an exception.`,
  },
  {
    id: 'lifetime-q05', lang: 'cpp', type: 'output', difficulty: 3,
    prompt: 'What does this program print? Watch *when* each temporary is destroyed.',
    codeLang: 'cpp',
    code: `#include <iostream>

struct Temp {
    int v;
    explicit Temp(int x) : v(x) { std::cout << "[make " << v << "] "; }
    ~Temp() { std::cout << "[kill " << v << "] "; }
    int get() const { return v; }
};

int main() {
    std::cout << "A " << Temp(1).get() << " B ";
    const Temp& keep = Temp(2);
    std::cout << keep.get() << " C ";
}`,
    options: [
      { text: 'A [make 1] 1 B [kill 1] [make 2] 2 C [kill 2]', correct: true, why: '`Temp(1)` lives until the end of its whole statement, so it dies after ` B `. `Temp(2)` is bound to a `const&`, which extends its life to the end of `main`.' },
      { text: 'A [make 1] [kill 1] 1 B [make 2] [kill 2] 2 C', correct: false, why: 'A temporary is not destroyed as soon as the call on it returns, but at the end of the full-expression. And without lifetime extension, `keep` would dangle.' },
      { text: '[make 1] A 1 B [kill 1] [make 2] 2 C [kill 2]', correct: false, why: 'Since C++17 the left operand of `<<` is evaluated before the right one, so `"A "` is printed before `Temp(1)` is even created.' },
      { text: 'A [make 1] 1 B [kill 1] [make 2] [kill 2] 2 C', correct: false, why: 'Binding a temporary directly to a local `const Temp&` extends its lifetime to that of the reference, so `Temp(2)` lives until the end of `main`, not just until its `;`.' },
    ],
    explanation: `A temporary lives until the end of the **full-expression** that created it, here the whole statement \`std::cout << "A " << Temp(1).get() << " B ";\`, not just the \`.get()\` call. So \`[kill 1]\` appears after \` B \`. Since C++17, \`a << b\` evaluates \`a\` before \`b\`, which fixes where \`[make 1]\` appears.

The exception is **lifetime extension**: a temporary bound directly to a local \`const T&\` (or \`T&&\`) lives as long as the reference, so \`Temp(2)\` dies at the end of \`main\`. Extension does not pass through function calls: a function that returns a reference to its argument, or a stored pointer to a temporary, leaves you with a dangling reference.`,
  },
  {
    id: 'lifetime-q06', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Given this code, which line does **not** compile?',
    codeLang: 'cpp',
    code: `class Meters {
public:
    explicit Meters(double v) : value(v) {}
    double value;
};

void walk(Meters m);`,
    options: [
      { text: '`walk(2.5);`', correct: true, why: '`walk` needs a `Meters`, and turning `2.5` into one would be an *implicit* conversion through the constructor, which is exactly what `explicit` forbids.' },
      { text: '`Meters a(5.0);`', correct: false, why: 'Direct initialization calls the constructor explicitly, by name. That is precisely how an `explicit` constructor is meant to be used.' },
      { text: '`walk(Meters{2.5});`', correct: false, why: 'The caller creates the `Meters` explicitly and passes it; no implicit conversion is involved.' },
      { text: '`auto m = static_cast<Meters>(1.0);`', correct: false, why: 'A cast is an explicit request for the conversion, so `explicit` allows it; it means the same as `Meters(1.0)`.' },
      { text: '`Meters b{5.0};`', correct: false, why: 'Brace direct-initialization names the type and calls the constructor explicitly. Only implicit forms, such as copy-initialization `Meters b = 5.0;`, are blocked.' },
    ],
    explanation: `A non-explicit constructor that can be called with one argument doubles as an **implicit conversion**. Without \`explicit\`, \`walk(2.5)\` would silently build a \`Meters\` from a bare number, and the type would no longer protect you from mixing up units.

\`explicit\` keeps the constructor available whenever you name the type (\`Meters a(5.0)\`, \`Meters{2.5}\`, casts) but rejects implicit uses: passing \`2.5\` where a \`Meters\` is expected, or copy-initialization like \`Meters b = 5.0;\`. GCC reports *could not convert '2.5e+0' from 'double' to 'Meters'*. Make one-argument constructors \`explicit\` by default.`,
  },
  {
    id: 'lifetime-q07', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>

class Box {
public:
    Box(int w, int h) : w_(w), h_(h) { std::cout << "target "; }
    Box() : Box(1, 1) { std::cout << "delegating "; }
    ~Box() { std::cout << "dtor "; }
private:
    int w_, h_;
};

int main() {
    Box b;
    std::cout << "use ";
}`,
    options: [
      { text: 'target delegating use dtor', correct: true, why: 'The target constructor runs completely (list and body) first, then the delegating constructor\'s body. There is one object, so one destructor call.' },
      { text: 'delegating target use dtor', correct: false, why: 'The delegating body cannot run first: it may use the members, and initializing them is the target constructor\'s job.' },
      { text: 'target delegating use dtor dtor', correct: false, why: 'Delegation does not create a second object. Both constructors work on the same object, and each object is destroyed exactly once.' },
      { text: 'target use dtor', correct: false, why: 'A delegating constructor may still have a body of its own; it runs right after the target constructor finishes.' },
    ],
    explanation: `A delegating constructor names another constructor of the same class as its **only** initializer. The **target** runs first and completely (its member-initializer list, then its body), and only then does the delegating constructor's body run, on the same object.

Once the target has finished, the object's lifetime has begun: if the delegating body threw, \`~Box()\` would run. Delegation keeps shared setup and validation in one place: \`Box() : Box(1, 1) {}\` reuses everything \`Box(int, int)\` does.`,
  },
  {
    id: 'lifetime-q08', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'What happens, in order, when Python evaluates `p = Point(1, 2)` for an ordinary class `Point`?',
    options: [
      { text: '`Point.__new__(Point, 1, 2)` creates a new object; because it is a `Point`, `__init__(obj, 1, 2)` then initializes it; finally the object is returned and bound to `p`.', correct: true, why: 'Creation and initialization are separate steps: `__new__` makes the object, and `__init__` fills in an object that already exists.' },
      { text: '`__init__` runs first and creates the object from the arguments; `__new__` then registers the finished object with its class and returns it.', correct: false, why: 'Reversed. `__init__` receives `self`, so the object must already exist when it runs; `__new__` is the step that creates it.' },
      { text: '`__init__` creates the object and returns it, which is bound to `p`; `__new__` is only involved for immutable built-in types such as `int` and `str`.', correct: false, why: '`__new__` runs for every class (usually the inherited `object.__new__`), and `__init__` must return `None`: returning anything else raises `TypeError`.' },
      { text: '`__new__` creates the object, and `__init__` runs only if the body of `__new__` calls it explicitly before returning the object.', correct: false, why: '`object.__new__` never calls `__init__`. It is `type.__call__`, the machinery behind `Point(...)`, that calls `__new__` and then `__init__`.' },
    ],
    explanation: `Calling a class runs \`type(Point).__call__\`, which does three things: it calls \`Point.__new__(Point, 1, 2)\` to **create** the instance; if the result is an instance of \`Point\`, it calls \`result.__init__(1, 2)\` to **initialize** it; then it returns the result. Most classes inherit \`object.__new__\` and only define \`__init__\`.

Override \`__new__\` only when the object must be chosen or fixed before initialization: subclasses of immutable types such as \`int\` or \`str\`, caches and singletons. C++ has the same split: \`new\` allocates the memory, then the constructor initializes it.`,
  },
  {
    id: 'lifetime-q09', lang: 'python', type: 'output', difficulty: 3,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Config:
    _instance = None

    def __new__(cls, name):
        print("new", name)
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, name):
        print("init", name)
        self.name = name


a = Config("x")
b = Config("y")
print(a is b, a.name)`,
    options: [
      { text: 'new x\ninit x\nnew y\ninit y\nTrue y', correct: true, why: '`__new__` returns the same cached object both times, and because it is a `Config`, `__init__` runs on it each time, overwriting `name` with `"y"`.' },
      { text: 'new x\ninit x\nnew y\nTrue x', correct: false, why: 'Python does not skip `__init__` for an object that already existed. `__init__` is skipped only when `__new__` returns something that is not an instance of the class.' },
      { text: 'new x\ninit x\nnew y\ninit y\nFalse x', correct: false, why: 'Calling a class does not force a new object: whatever `__new__` returns is the result, here the cached `_instance` both times, so `a is b`.' },
      { text: 'init x\nnew x\ninit y\nnew y\nTrue y', correct: false, why: '`__new__` must run first: it produces the object that `__init__` then receives as `self`.' },
      { text: 'new x\ninit x\nnew y\ninit y\nTrue x', correct: false, why: '`a` and `b` are the same object, and the second `__init__` call reassigned its `name`, so `a.name` sees the update.' },
    ],
    explanation: `Python calls \`__init__\` on whatever \`__new__\` returns, as long as it is an instance of the class, even an object that was created earlier. So a singleton written with \`__new__\` alone is **re-initialized** on every call: the second \`Config("y")\` silently overwrites \`name\`.

Fixes include guarding \`__init__\` (return early if already initialized), doing all the setup in \`__new__\`, or avoiding the pattern with a module-level instance. Module 19 discusses the Singleton pattern.`,
  },
  {
    id: 'lifetime-q10', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Section:
    def __init__(self, name):
        self.name = name

    def __enter__(self):
        print("enter", self.name)
        return self

    def __exit__(self, exc_type, exc, tb):
        print("exit", self.name, exc_type.__name__ if exc_type else None)
        return False


try:
    with Section("outer"):
        with Section("inner"):
            print("body")
            raise ValueError("boom")
        print("unreachable")
except ValueError:
    print("caught")`,
    options: [
      { text: 'enter outer\nenter inner\nbody\nexit inner ValueError\nexit outer ValueError\ncaught', correct: true, why: 'Context managers exit in reverse order of entry, and each `__exit__` runs while the exception propagates. Returning `False` lets it continue to the `except`.' },
      { text: 'enter outer\nenter inner\nbody\ncaught', correct: false, why: 'An exception does not skip `__exit__`: running cleanup on every exit path, errors included, is the whole point of `with`.' },
      { text: 'enter outer\nenter inner\nbody\nexit outer ValueError\nexit inner ValueError\ncaught', correct: false, why: 'Nested `with` blocks unwind like C++ locals: last entered, first exited. `inner` is closed before `outer`.' },
      { text: 'enter outer\nenter inner\nbody\nexit inner ValueError\nexit outer None\ncaught', correct: false, why: '`inner.__exit__` returned `False`, so it did not handle the exception. It keeps propagating, and `outer.__exit__` sees the same `ValueError`.' },
      { text: 'enter outer\nenter inner\nbody\ncaught\nexit inner ValueError\nexit outer ValueError', correct: false, why: 'The `except` clause runs only after the exception has left both `with` blocks, and leaving a block is exactly when its `__exit__` runs.' },
    ],
    explanation: `\`with cm as x:\` calls \`cm.__enter__()\` (its return value is bound to \`x\`), runs the block, then calls \`cm.__exit__(exc_type, exc, tb)\` however the block ends: normally (with three \`None\`s), by \`return\` or \`break\`, or with an exception. If \`__exit__\` returns a true value the exception is suppressed; \`False\` or \`None\` lets it propagate.

Nested blocks exit innermost first, mirroring C++ destructors at the end of a scope. \`"unreachable"\` is never printed: the exception left the inner block and skipped the rest of the outer one.`,
  },
  {
    id: 'lifetime-q11', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'A class closes its network connection in `__del__`. Why is this a poor way to guarantee cleanup?',
    options: [
      { text: 'Python promises neither *when* nor *whether* `__del__` runs: CPython calls it when the last reference goes away, but cycles wait for the garbage collector, PyPy runs it later, and at exit it may never run.', correct: true, why: 'Right. `__del__` is a finalizer tied to garbage collection, not to a scope. Use `with` (or an explicit `close()`) for deterministic cleanup.' },
      { text: '`__del__` runs immediately when `del conn` executes, so it is reliable as long as every caller remembers to write `del conn` when finished with the object.', correct: false, why: '`del conn` only removes the *name*. If any other reference exists (a list, a closure, a traceback), the object and its `__del__` live on.' },
      { text: '`__del__` is never called by CPython at all; the method exists only for compatibility with other Python implementations such as PyPy.', correct: false, why: 'CPython does call `__del__`, usually as soon as the reference count drops to zero. The problem is that this timing is an implementation detail, not a guarantee.' },
      { text: '`__del__` runs at the end of the block that created the object, exactly like a C++ destructor, but it is too slow to use for network resources.', correct: false, why: 'Python has no block scope and no scope-based destruction. An object lives as long as it is reachable, possibly long after the block or function that created it.' },
    ],
    explanation: `\`__del__\` is a **finalizer**: it runs when the object is reclaimed, and reclamation is up to the implementation. In CPython that is usually the moment the reference count hits zero, but objects in reference cycles wait for the cyclic garbage collector, PyPy finalizes whenever its collector runs, and the language reference says \`__del__\` is not guaranteed to run for objects that still exist when the interpreter exits. Exceptions raised inside it are merely printed as warnings.

For resources such as files, sockets and locks, use \`with\` and \`__enter__\`/\`__exit__\`: cleanup then happens at a known point, on every exit path.`,
  },
  {
    id: 'lifetime-q12', lang: 'both', type: 'compare', difficulty: 2,
    prompt: 'How does C++ RAII (cleanup in a destructor) compare with Python\'s `with` statement (cleanup in `__exit__`)?',
    options: [
      { text: 'Both run cleanup deterministically when a scope ends, even on an exception. In C++ every object of the type does it, so callers cannot forget; in Python the caller must opt in with `with`, and the object outlives the block.', correct: true, why: 'Right: the guarantee is the same (cleanup at a known point, on every path), but C++ attaches it to the type and Python to the call site.' },
      { text: 'They are identical: at the end of a `with` block Python calls the object\'s `__del__` and frees its memory, exactly like a C++ destructor at the end of a scope.', correct: false, why: '`with` calls `__exit__`, not `__del__`, and frees nothing: after `with open(p) as f:` the file is closed, yet the object `f` still exists.' },
      { text: 'RAII only manages memory: in C++, files, sockets and locks still have to be released by hand in `try`/`catch` blocks, whereas `with` handles any resource.', correct: false, why: 'RAII works for any resource: `std::lock_guard` releases mutexes and `std::fstream` closes files, so C++ code needs no `try`/`catch` just for cleanup (C++ does not even have `finally`).' },
      { text: 'Both run at the end of the scope, but only C++ is exception-safe: when the block raises an exception, Python skips `__exit__` and goes straight to the handler.', correct: false, why: '`__exit__` runs on exceptions too, and receives the exception details. Skipping cleanup on errors would defeat the purpose of `with`.' },
    ],
    explanation: `**RAII** ties a resource to an object's lifetime: the constructor acquires, the destructor releases, and C++ calls the destructor whenever the scope ends, normally, by \`return\` or by an exception. Users of the class get cleanup for free.

Python objects have no scope-based lifetime, so Python moves the guarantee to a **statement**: \`with\` calls \`__enter__\` at the start and \`__exit__\` at the end, on every path. The cleanup is just as deterministic, but only if the caller remembers to write \`with\`. Module 11 compares the two mechanisms in depth.`,
  },
  {
    id: 'lifetime-q13', lang: 'python', type: 'bug', difficulty: 1,
    prompt: "Creating `Temperature(20)` raises `TypeError: __init__() should return None, not 'Temperature'`. What is the bug?",
    codeLang: 'python',
    code: `class Temperature:
    def __init__(self, celsius):
        if celsius < -273.15:
            raise ValueError("below absolute zero")
        self.celsius = celsius
        return self


t = Temperature(20)`,
    options: [
      { text: '`__init__` must return `None`: it only initializes the object that `__new__` already created. Delete `return self`; `Temperature(20)` returns the object by itself.', correct: true, why: 'Python checks the result of `__init__` and rejects anything except `None`. The caller receives the instance that `__new__` created, not a value from `__init__`.' },
      { text: 'Raising `ValueError` in `__init__` is not allowed, because a constructor cannot fail; validate before calling `Temperature(...)`.', correct: false, why: 'Raising is exactly how an initializer refuses invalid arguments. The `TypeError` is caused by the `return self` line, not by the validation.' },
      { text: '`__init__` should `return celsius` instead, because an initializer must return the value it stored.', correct: false, why: 'Any return value other than `None` triggers the same `TypeError`. The return value of `__init__` is never used for anything.' },
      { text: 'The class must also define `__new__`: without it, `__init__` is not allowed to return the instance.', correct: false, why: 'Almost every class relies on the inherited `object.__new__`. Defining `__new__` would not make returning a value from `__init__` legal.' },
    ],
    explanation: `\`Temperature(20)\` first calls \`__new__\` to create the instance, then \`__init__\` to fill it in, and returns the instance that \`__new__\` produced. \`__init__\` works purely through side effects on \`self\`, so Python insists that it return \`None\` and raises \`TypeError\` otherwise.

\`return self\` for chaining belongs in ordinary methods (a builder's \`set_x()\`), never in \`__init__\`. Raising an exception in \`__init__\`, on the other hand, is the right way to refuse invalid arguments.`,
  },
  {
    id: 'lifetime-q14', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Which numbered lines fail to compile?',
    codeLang: 'cpp',
    code: `struct Point {
    int x = 0;
    int y = 0;
    Point(int x, int y) : x(x), y(y) {}
};

Point p;          // (1)
Point q(1, 2);    // (2)
Point arr[3];     // (3)`,
    options: [
      { text: '(1) and (3)', correct: true, why: 'Declaring `Point(int, int)` suppresses the implicit default constructor, and both `Point p;` and an array of three `Point`s need one.' },
      { text: 'None: the default member initializers `= 0` give `Point` a default constructor.', correct: false, why: 'Default member initializers only supply values *to* constructors; they do not create one. Once any constructor is declared, a default one exists only if you declare it, e.g. `Point() = default;`.' },
      { text: 'Only (1): an array is filled with zeros, so it needs no constructor.', correct: false, why: 'Each element of `Point arr[3]` is default-initialized, which calls the default constructor three times, and no such constructor exists.' },
      { text: 'Only (3): `Point p;` simply leaves `p` uninitialized.', correct: false, why: "For a class type, `Point p;` calls the default constructor; construction is never skipped. GCC reports no matching function for call to 'Point::Point()'." },
    ],
    explanation: `The compiler writes a default constructor only for a class that declares **no constructors at all**. As soon as you declare one, such as \`Point(int, int)\`, the implicit default constructor is gone, and everything that needs one fails: \`Point p;\`, \`Point arr[3];\`, \`std::vector<Point> v(5);\`.

To get it back, declare it: \`Point() = default;\` (which then uses the \`= 0\` initializers), or delegate with \`Point() : Point(0, 0) {}\`. Only do that if a default \`Point\` is a meaningful, valid object.`,
  },
  {
    id: 'lifetime-q15', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>

struct Res {
    const char* name;
    explicit Res(const char* n) : name(n) { std::cout << "open " << name << "\\n"; }
    ~Res() { std::cout << "close " << name << "\\n"; }
};

int main() {
    Res a("stack");
    Res* p = new Res("heap");
    std::cout << "using " << p->name << "\\n";
}`,
    options: [
      { text: 'open stack\nopen heap\nusing heap\nclose stack', correct: true, why: '`a` is destroyed at the end of `main`. The heap object is never `delete`d, so its destructor never runs.' },
      { text: 'open stack\nopen heap\nusing heap\nclose heap\nclose stack', correct: false, why: 'Destroying the pointer `p` at the end of `main` does nothing to the object it points to: a raw pointer owns nothing. Only `delete p` would run `~Res()`.' },
      { text: 'open stack\nopen heap\nusing heap\nclose stack\nclose heap', correct: false, why: 'Nothing calls destructors for leaked heap objects at program exit. The operating system reclaims the memory, but `~Res()` never runs.' },
      { text: 'open stack\nopen heap\nusing heap', correct: false, why: '`a` is an automatic object, so its destructor is guaranteed to run when `main` returns, whatever happens to the heap object.' },
    ],
    explanation: `An object created with \`new\` lives until someone calls \`delete\` on it, regardless of scopes. Nobody does here, so the heap object's \`~Res()\` never runs. That is a **leak**: the operating system reclaims the memory when the process ends, but any work the destructor would have done (flushing a file, releasing a lock, sending a goodbye message) is lost.

\`p\` itself is just a local pointer, and destroying it does nothing to the object it points to. Module 11 shows the fix: \`auto p = std::make_unique<Res>("heap");\` creates an owner that deletes the object when \`p\` goes out of scope.`,
  },
  {
    id: 'lifetime-q16', lang: 'cpp', type: 'concept', difficulty: 3,
    prompt: 'When the line marked `(*)` runs inside `~Logger()`, which statement is true?',
    codeLang: 'cpp',
    code: `class Logger {
public:
    ~Logger() {
        file_.write("bye");   // (*)
    }
private:
    File file_;
    Buffer buffer_;
};`,
    options: [
      { text: 'Both `file_` and `buffer_` are still alive. After the body finishes they are destroyed in reverse declaration order: `buffer_` first, then `file_`.', correct: true, why: 'Members outlive the destructor body precisely so that the body can still use them for cleanup, and they are destroyed in the reverse of their construction order.' },
      { text: '`file_` and `buffer_` have already been destroyed when the body starts, so `(*)` is undefined behavior.', correct: false, why: 'That would make destructor bodies nearly useless. Members are destroyed only *after* the destructor body has completed.' },
      { text: 'Both are alive. After the body they are destroyed in declaration order: `file_` first, then `buffer_`.', correct: false, why: 'Destruction mirrors construction: members were built `file_` then `buffer_`, so they are destroyed `buffer_` then `file_`.' },
      { text: 'They are alive, but the destructor must destroy them itself, e.g. by calling `file_.~File()` at the end of the body.', correct: false, why: 'Never call a member\'s destructor by hand. The compiler destroys members automatically after the body, so a manual call would destroy `file_` twice (undefined behavior).' },
    ],
    explanation: `Destroying an object is the exact reverse of constructing it: first the **destructor body** runs, while every member is still intact; then the **members are destroyed in reverse declaration order**; then the base classes (Module 05). So \`~Logger()\` can safely write through \`file_\`, and \`buffer_\`, declared later, is destroyed before \`file_\`.

This is also why a destructor body often has little to do: members that are themselves RAII types (\`std::string\`, \`std::vector\`, \`std::unique_ptr\`, file streams) clean up after themselves automatically.`,
  },
];
