export default [
  {
    id: 'exceptions-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'Why does an exception class hierarchy (e.g. `AppError` -> `ValidationError`) help?',
    options: [
      { text: 'Callers can catch a specific error, or a whole family by catching the base class.', correct: true, why: 'A handler for a base class also matches every derived exception, so one type name covers a family.' },
      { text: 'It makes exceptions faster to throw.', correct: false, why: 'Hierarchies affect how handlers match, not the cost of throwing.' },
      { text: 'It stops callers from catching errors they do not understand.', correct: false, why: 'Anyone can catch any type; the hierarchy only organizes the choices.' },
      { text: 'It is required: you may only throw classes that have a base class.', correct: false, why: 'C++ can throw any type and Python needs a BaseException subclass, but no custom base is required.' },
    ],
    explanation: `Because exceptions are objects, inheritance decides what a handler catches. A library with one base such as \`AppError\` lets callers write \`except AppError\` for "anything from this library" or \`except ValidationError\` for one case. Handlers should be ordered from specific to general.`,
  },
  {
    id: 'exceptions-q02', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
struct Base {
    virtual ~Base() = default;
    virtual const char* what() const { return "base"; }
};
struct Derived : Base {
    const char* what() const override { return "derived"; }
};
int main() {
    try { throw Derived(); }
    catch (Base b) { std::cout << b.what() << " "; }
    try { throw Derived(); }
    catch (const Base& b) { std::cout << b.what(); }
}`,
    options: [
      { text: 'base derived', correct: true, why: 'Catching by value copies only the Base part (slicing); by const reference keeps the Derived object.' },
      { text: 'derived derived', correct: false, why: 'A by-value catch constructs a Base, so the virtual call can only reach Base::what.' },
      { text: 'derived base', correct: false, why: 'This reverses the cases: by value slices, by reference does not.' },
      { text: 'base base', correct: false, why: 'The reference handler binds to the original Derived, so virtual dispatch still works.' },
    ],
    explanation: `\`catch (Base b)\` copy-initializes a \`Base\` from the thrown \`Derived\`, discarding everything that makes it a \`Derived\`: **slicing**. \`catch (const Base& b)\` binds to the thrown object itself, so virtual calls still reach \`Derived\`. Always catch by (const) reference.`,
  },
  {
    id: 'exceptions-q03', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'In this code, which handler runs for `throw Derived();` if `Derived` inherits from `Base`?',
    codeLang: 'cpp',
    code: `try { throw Derived(); }
catch (const Base&)    { /* handler 1 */ }
catch (const Derived&) { /* handler 2 */ }`,
    options: [
      { text: 'Handler 1: the first handler that matches wins, and a base reference matches a derived object.', correct: true, why: 'Handlers are tried top to bottom and Base& can bind to a Derived exception.' },
      { text: 'Handler 2: the best match wins, like overload resolution.', correct: false, why: 'Catch clauses are tried in order, not ranked by how close the type is.' },
      { text: 'Both run, one after the other.', correct: false, why: 'Only one handler of a try block ever runs for a given exception.' },
      { text: 'Neither: this is a compile error.', correct: false, why: 'It compiles (compilers may warn that handler 2 is unreachable).' },
    ],
    explanation: `C++ tries catch clauses in the order written and picks the **first** whose type can bind to the exception. Unlike overload resolution there is no "best match". Put derived types first and the base last. Python's \`except\` clauses behave the same way.`,
  },
  {
    id: 'exceptions-q04', lang: 'cpp', type: 'bug', difficulty: 2,
    prompt: 'The author wants `MyError` handled specially, but its handler never runs. Why?',
    codeLang: 'cpp',
    code: `struct MyError : std::runtime_error {
    using std::runtime_error::runtime_error;
};
void run() {
    try { throw MyError("boom"); }
    catch (const std::exception& e) { /* generic */ }
    catch (const MyError& e)        { /* special: never reached */ }
}`,
    options: [
      { text: 'The `std::exception` handler comes first and also matches `MyError`, so it catches it.', correct: true, why: 'MyError derives from std::exception through runtime_error; first match wins.' },
      { text: '`MyError` cannot be thrown by value.', correct: false, why: 'Throwing by value is the recommended style.' },
      { text: '`using std::runtime_error::runtime_error;` hides the constructor.', correct: false, why: 'The using-declaration inherits the base constructors; it does not stop the throw.' },
      { text: 'Handlers run from the last one to the first.', correct: false, why: 'They are tried top to bottom.' },
    ],
    explanation: `Swap the two handlers so the more derived type comes first: \`catch (const MyError&)\` then \`catch (const std::exception&)\`. A handler for a base class swallows all its derived types, so placing it earlier makes the specific handler unreachable.`,
  },
  {
    id: 'exceptions-q05', lang: 'cpp', type: 'output', difficulty: 3,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <stdexcept>
struct Part {
    Part() { std::cout << "Part "; }
    ~Part() { std::cout << "~Part "; }
};
struct Widget {
    Part p;
    Widget() { std::cout << "Widget "; throw std::runtime_error("x"); }
    ~Widget() { std::cout << "~Widget "; }
};
int main() {
    try { Widget w; }
    catch (const std::exception&) { std::cout << "caught"; }
}`,
    options: [
      { text: 'Part Widget ~Part caught', correct: true, why: 'The member is destroyed during unwinding; the Widget destructor never runs because the object was never completed.' },
      { text: 'Part Widget ~Widget ~Part caught', correct: false, why: 'A destructor runs only for fully constructed objects; the constructor did not finish.' },
      { text: 'Part Widget caught', correct: false, why: 'Already constructed members are destroyed on unwinding, so ~Part still prints.' },
      { text: 'Widget caught', correct: false, why: 'Members are constructed before the constructor body, so Part is printed first.' },
    ],
    explanation: `If a constructor exits by exception, every fully constructed base and member is destroyed in reverse order, but the class's own destructor does **not** run, because the object's lifetime never began. This is why resources should be owned by members (RAII wrappers) rather than acquired raw in the constructor body.`,
  },
  {
    id: 'exceptions-q06', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'What does the **strong** exception-safety guarantee promise?',
    options: [
      { text: 'If the operation throws, the object is unchanged, as if it had never been called.', correct: true, why: 'Strong means commit-or-rollback: all or nothing.' },
      { text: 'The operation never throws.', correct: false, why: 'That is the nothrow guarantee.' },
      { text: 'There are no leaks, but values may have changed.', correct: false, why: 'That describes only the basic guarantee.' },
      { text: 'Exceptions are caught inside the function.', correct: false, why: 'Strong safety is about state after propagation; the exception still reaches the caller.' },
    ],
    explanation: `The levels are: none, basic (invariants hold, no leaks), strong (rollback on failure) and nothrow. **Copy-and-swap** achieves strong: modify a copy, and only when all risky steps succeed, commit with a non-throwing swap or assignment.`,
  },
  {
    id: 'exceptions-q07', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Why must a destructor never let an exception escape?',
    options: [
      { text: 'During stack unwinding a second exception leaves no valid handler, so `std::terminate` is called (and destructors are noexcept by default).', correct: true, why: 'Two in-flight exceptions cannot both propagate; the runtime aborts.' },
      { text: 'Destructors cannot contain a try block.', correct: false, why: 'They can; catch inside the destructor and swallow or log.' },
      { text: 'It would leak the memory of the object.', correct: false, why: 'The leak is not the issue; the program is terminated.' },
      { text: 'Only because it is considered bad style.', correct: false, why: 'It is a hard rule with defined consequences, not style.' },
    ],
    explanation: `Destructors run during unwinding, and a new exception escaping one while another is active would leave the runtime with two exceptions. Since C++11 destructors are implicitly \`noexcept\`, so an escape calls \`std::terminate\`. Catch and handle errors inside the destructor instead.`,
  },
  {
    id: 'exceptions-q08', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'After `raise ConfigError("bad") from err`, what is `exc.__cause__`?',
    options: [
      { text: 'The original exception `err`.', correct: true, why: 'raise X from Y stores Y as X.__cause__ and prints both in the traceback.' },
      { text: '`None`; only `__context__` is set.', correct: false, why: '__context__ is set implicitly, but "from" sets __cause__ explicitly.' },
      { text: 'The string "bad".', correct: false, why: 'The message lives in args; __cause__ is an exception object.' },
      { text: 'The traceback object.', correct: false, why: 'The traceback is __traceback__.' },
    ],
    explanation: `\`raise X from Y\` records an explicit cause in \`X.__cause__\`. If you raise inside an \`except\` block without \`from\`, Python sets \`__context__\` to the exception being handled. Use \`from None\` to suppress the context. Wrapping low-level errors in domain errors with \`from\` keeps the original reason visible.`,
  },
  {
    id: 'exceptions-q09', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `try:
    print("try")
    x = 1
except ValueError:
    print("except")
else:
    print("else")
finally:
    print("finally")`,
    options: [
      { text: 'try\nelse\nfinally', correct: true, why: 'With no exception, else runs after the try block, then finally always runs.' },
      { text: 'try\nfinally', correct: false, why: 'else runs when the try block raises nothing, before finally.' },
      { text: 'try\nexcept\nfinally', correct: false, why: 'except only runs when a matching exception is raised.' },
      { text: 'try\nfinally\nelse', correct: false, why: 'finally runs last, after else.' },
    ],
    explanation: `The order is: \`try\` body; if it raised, the matching \`except\`; if it did not, the \`else\` block; and \`finally\` always last, even on \`return\` or an unhandled exception. Keep only the risky statement in \`try\` and put dependent code in \`else\` so unrelated errors are not caught by accident.`,
  },
  {
    id: 'exceptions-q10', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'With `class NotFound(LookupError)`, which handler catches `raise NotFound()` here?',
    codeLang: 'python',
    code: `try:
    raise NotFound()
except LookupError:
    print("lookup")
except NotFound:
    print("not found")`,
    options: [
      { text: 'The `LookupError` handler: the first match wins and the subclass instance matches it.', correct: true, why: 'Python checks except clauses in order using isinstance semantics.' },
      { text: 'The `NotFound` handler: the most specific wins.', correct: false, why: 'There is no ranking; order decides.' },
      { text: 'Both handlers run.', correct: false, why: 'Only the first matching clause executes.' },
      { text: 'Neither: an exception subclass cannot be caught by its base.', correct: false, why: 'Catching by base class is the normal use of a hierarchy.' },
    ],
    explanation: `\`except LookupError\` matches any instance of \`LookupError\` or its subclasses, so it catches \`NotFound\`. Put the subclass clause first. Python (and linters) will often flag an unreachable handler.`,
  },
  {
    id: 'exceptions-q11', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'Why give a custom exception extra fields (like `needed` or `field`)?',
    options: [
      { text: 'Handlers can react programmatically instead of parsing the message string.', correct: true, why: 'Structured data (amount, field name) is reliable; message text is for humans.' },
      { text: 'It makes the exception propagate faster.', correct: false, why: 'Fields have no effect on propagation.' },
      { text: 'Exceptions without fields cannot be caught.', correct: false, why: 'Plain exceptions are caught the same way.' },
      { text: 'It is required to call `what()` or `str()`.', correct: false, why: 'Those work with just a message.' },
    ],
    explanation: `An exception is an object, so it can carry the data needed to recover: how much was needed, which field failed validation, an error code. Call sites can then handle \`e.needed\` or \`e.field()\` directly rather than matching text that may change.`,
  },
  {
    id: 'exceptions-q12', lang: 'both', type: 'compare', difficulty: 3,
    prompt: 'How does C++ `noexcept` compare with Python?',
    options: [
      { text: 'C++ `noexcept` is a checked-at-run-time promise (violations call `std::terminate`) and lets the compiler optimize; Python has no such declaration.', correct: true, why: 'A noexcept function that throws terminates the program; Python offers no equivalent contract.' },
      { text: 'Python has `noexcept` too, spelled `@nothrow`.', correct: false, why: 'No such decorator exists in the standard library.' },
      { text: 'A `noexcept` function that throws just propagates normally.', correct: false, why: 'The exception cannot leave a noexcept function; the program terminates.' },
      { text: '`noexcept` makes a function compile-time only.', correct: false, why: 'That is constexpr; noexcept concerns exceptions.' },
    ],
    explanation: `\`noexcept\` is part of a function's contract: if an exception tries to escape, \`std::terminate\` is called. Containers use it (e.g. \`std::vector\` moves elements only if the move constructor is \`noexcept\`). Python does not declare or enforce what a function may raise.`,
  },
  {
    id: 'exceptions-q13', lang: 'cpp', type: 'compare', difficulty: 3,
    prompt: 'Inside `catch (const Base& e)`, what is the difference between `throw;` and `throw e;`?',
    options: [
      { text: '`throw;` rethrows the original object (keeping its dynamic type); `throw e;` throws a copy of the static type `Base`, slicing it.', correct: true, why: 'throw expression copies from the static type of the expression, so derived data is lost.' },
      { text: 'They are identical.', correct: false, why: 'throw e; makes a new copy of the static type; throw; reuses the active exception.' },
      { text: '`throw e;` preserves the dynamic type, but `throw;` slices.', correct: false, why: 'The reverse is true.' },
      { text: '`throw;` is only valid outside catch blocks.', correct: false, why: 'A bare throw is only valid when an exception is being handled.' },
    ],
    explanation: `A bare \`throw;\` rethrows the exception currently being handled, with no copy. \`throw e;\` creates a new exception by copying \`e\` as its *static* type, so a \`Derived\` caught as \`const Base&\` would arrive sliced to \`Base\`. Use \`throw;\` to propagate.`,
  },
  {
    id: 'exceptions-q14', lang: 'python', type: 'bug', difficulty: 2,
    prompt: 'What is wrong with this loop?',
    codeLang: 'python',
    code: `while True:
    try:
        work()
    except:
        pass`,
    options: [
      { text: 'The bare `except:` also swallows `KeyboardInterrupt` and `SystemExit`, so Ctrl+C cannot stop the loop.', correct: true, why: 'Those derive from BaseException, and a bare except catches everything.' },
      { text: 'A `try` cannot be inside `while True`.', correct: false, why: 'try blocks can appear anywhere a statement can.' },
      { text: '`pass` is not allowed in handlers.', correct: false, why: 'pass is a valid no-op; the problem is what is caught and silenced.' },
      { text: 'Nothing; it is the recommended way to ignore errors.', correct: false, why: 'Catching Exception (and logging) is acceptable; a bare except is not.' },
    ],
    explanation: `\`KeyboardInterrupt\` and \`SystemExit\` inherit from \`BaseException\`, not \`Exception\`, precisely so that \`except Exception\` leaves them alone. Use the narrowest class you can handle, and avoid silently passing errors.`,
  },
  {
    id: 'exceptions-q15', lang: 'python', type: 'concept', difficulty: 3,
    prompt: 'What is `except*` (Python 3.11+) for?',
    options: [
      { text: 'Handling an `ExceptionGroup` that bundles several unrelated errors, matching each member by type.', correct: true, why: 'except* splits the group and runs a handler per matching subset.' },
      { text: 'Catching any exception, like a wildcard.', correct: false, why: 'It still matches by type, only against group members.' },
      { text: 'Making a handler run faster.', correct: false, why: 'It has no performance purpose.' },
      { text: 'Replacing `finally`.', correct: false, why: 'finally is unrelated and still needed.' },
    ],
    explanation: `Concurrent code (such as \`asyncio.TaskGroup\`) can fail in several tasks at once. \`ExceptionGroup\` carries all the errors and \`except*\` handles each type separately, so multiple handlers may run for one group. Ordinary \`except\` cannot match inside a group.`,
  },
];
