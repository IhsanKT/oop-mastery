## Why exceptions?

A function that can fail has to tell its caller. Return codes mix the answer with the error, and every caller must remember to check, or the failure is silently ignored. **Exceptions** separate the two: the success path reads straight through, and a failure unwinds the stack to the nearest handler that understands it. Because an error is an *object*, it can carry data (which field, how much was needed) and can be organized in a class hierarchy, so inheritance decides what a handler catches.

## Designing an exception hierarchy

Give your library one base exception, then specific subclasses. Callers can catch precisely (`InsufficientFunds`) or broadly (`BankError`). Always list handlers from specific to general.

~~~cpp
#include <stdexcept>
#include <string>

class BankError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};
class InsufficientFunds : public BankError {
    double needed_;
public:
    explicit InsufficientFunds(double needed)
        : BankError("insufficient funds"), needed_(needed) {}
    double needed() const { return needed_; }
};

try { throw InsufficientFunds(25.0); }
catch (const InsufficientFunds& e) { /* specific */ }
catch (const BankError& e)         { /* broader  */ }
~~~
~~~python
class BankError(Exception):
    """Base class for everything this library raises."""

class InsufficientFunds(BankError):
    def __init__(self, needed):
        super().__init__("insufficient funds")
        self.needed = needed

try:
    raise InsufficientFunds(25.0)
except InsufficientFunds as e:     # specific first
    print(e.needed)
except BankError:                  # then general
    pass
~~~

> **Pitfall:** The *first* matching handler wins. If `catch (const std::exception&)` comes before `catch (const MyError&)`, the specific handler is dead code; Python behaves the same with `except Exception` before `except MyError`.

## C++ rules: by value, by const reference

Throw by value, catch by `const` reference. Catching by value *slices*: a copy of only the base part is made, and the derived message and data are lost.

~~~cpp
struct Base : std::exception {
    const char* what() const noexcept override { return "base"; }
};
struct Derived : Base {
    const char* what() const noexcept override { return "derived"; }
};

try { throw Derived(); }
catch (Base e)        { /* e.what() is "base": sliced */ }

try { throw Derived(); }
catch (const Base& e) { /* e.what() is "derived" */ }

try { try { throw Derived(); } catch (const Base&) { throw; } }   // throw; rethrows the original
catch (const Derived&) { /* still a Derived; "throw e;" would re-throw a sliced copy */ }
~~~
~~~python
try:
    try:
        raise ValueError("original")
    except ValueError:
        raise            # bare raise re-raises the same exception object
except ValueError as e:
    print(e)             # original
~~~

`what()` returns the message and is `noexcept`. Mark functions that cannot throw `noexcept`: if one does throw, `std::terminate` is called. Python has no equivalent promise.

## Exception safety guarantees

When an exception passes through your code, what state is the object left in?

- **No guarantee:** anything may be broken.
- **Basic:** invariants hold, no leaks, but values may have changed.
- **Strong:** all or nothing; the operation either fully succeeds or has no effect.
- **Nothrow:** never throws (destructors, `swap`, moves).

**Copy-and-swap** gives the strong guarantee: do the risky work on a copy, then commit with a non-throwing swap.

~~~cpp
class Inventory {
    std::vector<std::string> items_;
public:
    void addAll(const std::vector<std::string>& more) {
        std::vector<std::string> tmp = items_;        // work on a copy
        for (const auto& s : more) {
            if (s.empty()) throw std::invalid_argument("empty item");
            tmp.push_back(s);
        }
        items_.swap(tmp);                              // nothrow commit
    }
};
~~~
~~~python
class Inventory:
    def __init__(self):
        self._items = []

    def add_all(self, more):
        tmp = list(self._items)        # work on a copy
        for s in more:
            if not s:
                raise ValueError("empty item")
            tmp.append(s)
        self._items = tmp              # commit (a single rebinding)
~~~

## Constructors, destructors and RAII

If a constructor throws, the object never existed: its already-constructed members and bases are destroyed in reverse order, but **its own destructor does not run**. This is why resources should be held by members (RAII) rather than acquired raw in the constructor body. Never throw out of a destructor: during stack unwinding a second exception means `std::terminate`, and destructors are `noexcept` by default.

~~~cpp
struct Part { ~Part() { std::cout << "~Part "; } };
struct Widget {
    Part p;
    Widget() { throw std::runtime_error("fail"); }
    ~Widget() { std::cout << "~Widget "; }
};
try { Widget w; } catch (...) {}      // prints "~Part " only
~~~
~~~python
class Widget:
    def __init__(self):
        raise RuntimeError("fail")    # object is created by __new__, but the caller never gets it
    def __del__(self):
        print("__del__ may still run on the half-built object")
~~~

## Python's extras

~~~cpp
// C++ has no finally: RAII objects clean up in destructors instead.
// There is no exception chaining; std::throw_with_nested/rethrow_if_nested are the closest.
try { try { throw 1; } catch (...) { std::throw_with_nested(std::runtime_error("wrapped")); } }
catch (const std::exception&) {}
~~~
~~~python
class ConfigError(Exception):
    pass

def load(text):
    try:
        return int(text)
    except ValueError as e:
        raise ConfigError("bad config") from e   # sets __cause__
    else:
        pass                                      # runs only if no exception was raised
    finally:
        print("cleanup")                          # always runs

# ExceptionGroup and except* handle several concurrent errors (Python 3.11+)
try:
    raise ExceptionGroup("many", [ValueError("a"), TypeError("b")])
except* ValueError as eg:
    print(len(eg.exceptions))                     # 1
except* TypeError:
    pass
~~~

`raise X from Y` sets `X.__cause__ = Y`; an exception raised while handling another gets `__context__` automatically. Context managers use `__exit__(self, exc_type, exc, tb)`, which runs on both success and failure; returning true suppresses the exception.

> **Pitfall:** A bare `except:` also catches `KeyboardInterrupt` and `SystemExit`. Catch `Exception` (or something narrower).

## When not to use exceptions

Use them for *unexpected* failures a caller usually cannot handle locally. Do not use them for ordinary control flow: "key not found" in a search, user input that is often wrong, or hot loops where failure is the common case. There, return `std::optional`, a status value or `None`.

## Key takeaways

- Exceptions carry errors as objects, and a hierarchy lets callers catch narrowly or broadly.
- The first matching handler wins, so catch specific types before general ones.
- C++: throw by value, catch by `const` reference; catching by value slices.
- `throw;` rethrows the original; `throw e;` throws a copy of the static type.
- Guarantees: none, basic, strong, nothrow; copy-and-swap achieves strong.
- A throwing constructor destroys built members but never runs the class's own destructor; destructors must not throw.
- Python adds `raise ... from`, `else`, `finally` and `except*`.
- Do not use exceptions for expected, frequent outcomes.

## Common pitfalls

- Catching a base class by value and losing the derived message and data.
- Ordering a general handler before a specific one.
- Acquiring raw resources in a constructor body that can throw afterwards.
- Writing a bare `except:` that hides `KeyboardInterrupt`.
- Throwing from a destructor, which can call `std::terminate`.
- Converting an exception without `from`, losing the original cause.
