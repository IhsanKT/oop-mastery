export default [
  {
    id: 'exceptions-e01', lang: 'cpp', title: 'A bank exception hierarchy', difficulty: 2,
    task: `Model bank failures as exception classes.

- \`class BankError : public std::runtime_error\` (inherit its constructors).
- \`class InsufficientFunds : public BankError\` with constructor \`explicit InsufficientFunds(double needed)\`; \`what()\` is \`"insufficient funds"\`; \`double needed() const\` returns the amount that was missing.
- \`class AccountLocked : public BankError\` with a default constructor; \`what()\` is \`"account locked"\`.
- \`class Account\` with \`explicit Account(double balance)\`, \`void lock()\`, \`double balance() const\` and \`void withdraw(double amount)\`. A locked account throws \`AccountLocked\` (checked first). Otherwise, if \`amount > balance\`, it throws \`InsufficientFunds(amount - balance)\`. Otherwise the balance decreases.

~~~cpp
Account a(100);
try { a.withdraw(130); }
catch (const InsufficientFunds& e) { e.needed(); }   // 30
~~~`,
    starter: `#include <stdexcept>
#include <string>

class BankError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

class InsufficientFunds : public BankError {
public:
    explicit InsufficientFunds(double needed) : BankError("insufficient funds") { (void)needed; }
    double needed() const { return 0; }
};

class AccountLocked : public BankError {
public:
    AccountLocked() : BankError("account locked") {}
};

class Account {
    double balance_;
public:
    explicit Account(double balance) : balance_(balance) {}
    void lock() {}
    double balance() const { return balance_; }
    void withdraw(double amount) { (void)amount; }
};
`,
    tests: [
      { name: 'hierarchy', code: `EXPECT((std::is_base_of_v<std::runtime_error, BankError>));
EXPECT((std::is_base_of_v<BankError, InsufficientFunds>));
EXPECT((std::is_base_of_v<BankError, AccountLocked>));` },
      { name: 'successful withdrawal', code: `Account a(100);
a.withdraw(40);
EXPECT_NEAR(a.balance(), 60.0, 1e-9);
a.withdraw(60);
EXPECT_NEAR(a.balance(), 0.0, 1e-9);` },
      { name: 'insufficient funds carries data', code: `Account a(100);
EXPECT_THROWS(a.withdraw(130), InsufficientFunds);
bool caught = false;
try { a.withdraw(130); }
catch (const InsufficientFunds& e) {
    caught = true;
    EXPECT_NEAR(e.needed(), 30.0, 1e-9);
    EXPECT_EQ(std::string(e.what()), std::string("insufficient funds"));
}
EXPECT(caught);
EXPECT_NEAR(a.balance(), 100.0, 1e-9);` },
      { name: 'locked account', code: `Account a(100);
a.lock();
EXPECT_THROWS(a.withdraw(500), AccountLocked);
bool caught = false;
try { a.withdraw(1); }
catch (const BankError& e) { caught = true; EXPECT_EQ(std::string(e.what()), std::string("account locked")); }
EXPECT(caught);
EXPECT_NEAR(a.balance(), 100.0, 1e-9);` },
    ],
    hints: [
      'Store needed in a private member and return it from needed(); pass "insufficient funds" to the BankError constructor.',
      'In withdraw: if (locked_) throw AccountLocked(); if (amount > balance_) throw InsufficientFunds(amount - balance_); balance_ -= amount; (add a bool locked_ set by lock()).',
    ],
    solution: `#include <stdexcept>
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

class AccountLocked : public BankError {
public:
    AccountLocked() : BankError("account locked") {}
};

class Account {
    double balance_;
    bool locked_ = false;
public:
    explicit Account(double balance) : balance_(balance) {}
    void lock() { locked_ = true; }
    double balance() const { return balance_; }
    void withdraw(double amount) {
        if (locked_) throw AccountLocked();
        if (amount > balance_) throw InsufficientFunds(amount - balance_);
        balance_ -= amount;
    }
};
`,
    explanation: `**Errors as a type hierarchy.** \`BankError\` is the root for everything this module throws, and it derives from \`std::runtime_error\` so generic code can still catch \`std::exception\` and call \`what()\`. A caller can handle \`InsufficientFunds\` specifically (using \`needed()\` to offer a top-up) or catch \`BankError\` for any bank failure.

**Validate first, mutate last.** \`withdraw\` checks every precondition before changing \`balance_\`, so a failed call leaves the account unchanged. Callers should catch by \`const&\` to avoid slicing the derived data away.`,
  },
  {
    id: 'exceptions-e02', lang: 'cpp', title: 'Inventory with the strong guarantee', difficulty: 3,
    task: `Implement an all-or-nothing bulk insert.

- \`struct Item { std::string name; int qty; };\`
- \`class Inventory\` with \`void addAll(const std::vector<Item>& items)\`, \`std::size_t size() const\` (number of stored items) and \`int total() const\` (sum of all \`qty\`).
- An item is **invalid** if \`name\` is empty or \`qty <= 0\`. \`addAll\` throws \`std::invalid_argument\` on the first invalid item, and in that case the inventory must be **exactly as before** (strong guarantee). Otherwise every item is added.

~~~cpp
Inventory inv;
inv.addAll({{"bolt", 5}, {"nut", 3}});
inv.addAll({{"gear", 1}, {"", 2}});   // throws; "gear" is NOT added
inv.size();                            // 2
~~~`,
    starter: `#include <cstddef>
#include <stdexcept>
#include <string>
#include <vector>

struct Item {
    std::string name;
    int qty;
};

class Inventory {
    std::vector<Item> items_;
public:
    // Basic guarantee only: items added before the bad one stay.
    void addAll(const std::vector<Item>& items) {
        for (const Item& it : items) {
            if (it.name.empty() || it.qty <= 0) throw std::invalid_argument("bad item");
            items_.push_back(it);
        }
    }
    std::size_t size() const { return items_.size(); }
    int total() const {
        int t = 0;
        for (const Item& it : items_) t += it.qty;
        return t;
    }
};
`,
    tests: [
      { name: 'adds all valid items', code: `Inventory inv;
inv.addAll({{"bolt", 5}, {"nut", 3}});
EXPECT_EQ(inv.size(), std::size_t(2));
EXPECT_EQ(inv.total(), 8);
inv.addAll({{"gear", 2}});
EXPECT_EQ(inv.size(), std::size_t(3));
EXPECT_EQ(inv.total(), 10);` },
      { name: 'invalid name throws and changes nothing', code: `Inventory inv;
inv.addAll({{"bolt", 5}});
EXPECT_THROWS(inv.addAll({{"gear", 1}, {"", 2}}), std::invalid_argument);
EXPECT_EQ(inv.size(), std::size_t(1));
EXPECT_EQ(inv.total(), 5);` },
      { name: 'invalid quantity throws and changes nothing', code: `Inventory inv;
EXPECT_THROWS(inv.addAll({{"a", 1}, {"b", 2}, {"c", 0}}), std::invalid_argument);
EXPECT_EQ(inv.size(), std::size_t(0));
EXPECT_THROWS(inv.addAll({{"a", -4}}), std::invalid_argument);
EXPECT_EQ(inv.total(), 0);` },
      { name: 'empty batch is fine', code: `Inventory inv;
inv.addAll({});
EXPECT_EQ(inv.size(), std::size_t(0));` },
    ],
    hints: [
      'Do not touch items_ until every item has been validated.',
      'Copy-and-swap: std::vector<Item> tmp = items_; loop over the batch validating and tmp.push_back(it); after the loop call items_.swap(tmp). If anything throws, items_ was never modified.',
    ],
    solution: `#include <cstddef>
#include <stdexcept>
#include <string>
#include <vector>

struct Item {
    std::string name;
    int qty;
};

class Inventory {
    std::vector<Item> items_;
public:
    void addAll(const std::vector<Item>& items) {
        std::vector<Item> tmp = items_;
        for (const Item& it : items) {
            if (it.name.empty() || it.qty <= 0) throw std::invalid_argument("bad item");
            tmp.push_back(it);
        }
        items_.swap(tmp);
    }
    std::size_t size() const { return items_.size(); }
    int total() const {
        int t = 0;
        for (const Item& it : items_) t += it.qty;
        return t;
    }
};
`,
    explanation: `**Copy-and-swap.** All the work, including every operation that can throw, happens on a copy (\`tmp\`). Only when the whole batch has succeeded do we commit with \`swap\`, which cannot throw. A failure anywhere leaves \`items_\` untouched: that is the **strong exception guarantee**.

The starter shows the weaker **basic guarantee**: it stays valid, but earlier items remain after a failure. The same idea in Python is building a new list and assigning it to the attribute at the end.`,
  },
  {
    id: 'exceptions-e03', lang: 'python', title: 'Validation errors with causes', difficulty: 2,
    task: `Build a small exception hierarchy and wrap low-level errors.

- \`class AppError(Exception)\`.
- \`class ValidationError(AppError)\` with \`__init__(self, field, message)\`; it stores \`self.field\`, and \`str(e)\` is \`message\`.
- \`class InvalidName(ValidationError)\` (field \`"name"\`) and \`class InvalidAge(ValidationError)\` (field \`"age"\`), each constructed with just a message.
- \`parse_age(text)\` returns \`int(text)\`. If \`int()\` raises \`ValueError\`, raise \`InvalidAge("age must be a number")\` **from** that error.
- \`class UserService\` with \`register(self, name, age)\`: an empty or non-string \`name\` raises \`InvalidName\`; an \`age\` that is not an int between 0 and 150 raises \`InvalidAge\`; otherwise it returns \`{"name": name, "age": age}\`.

~~~python
try: parse_age("abc")
except InvalidAge as e:
    e.field            # "age"
    type(e.__cause__)  # <class 'ValueError'>
~~~`,
    starter: `class AppError(Exception):
    pass


class ValidationError(AppError):
    def __init__(self, field, message):
        raise NotImplementedError


class InvalidName(ValidationError):
    pass


class InvalidAge(ValidationError):
    pass


def parse_age(text):
    raise NotImplementedError


class UserService:
    def register(self, name, age):
        raise NotImplementedError
`,
    tests: [
      { name: 'hierarchy and fields', code: `assert issubclass(ValidationError, AppError)
assert issubclass(InvalidName, ValidationError) and issubclass(InvalidAge, ValidationError)
e = InvalidAge("too old")
assert e.field == "age" and str(e) == "too old"
assert InvalidName("x").field == "name"` },
      { name: 'register success', code: `s = UserService()
assert s.register("Ada", 36) == {"name": "Ada", "age": 36}` },
      { name: 'register rejects bad input', code: `s = UserService()
for args, exc in ((("", 20), InvalidName), ((None, 20), InvalidName),
                  (("Ada", -1), InvalidAge), (("Ada", 151), InvalidAge), (("Ada", "20"), InvalidAge)):
    try:
        s.register(*args)
        assert False, "should reject " + repr(args)
    except exc:
        pass
    except Exception as other:
        assert False, "wrong type for " + repr(args) + ": " + type(other).__name__
try:
    s.register("", 20)
except AppError:
    pass` },
      { name: 'parse_age wraps ValueError with from', code: `assert parse_age("42") == 42
try:
    parse_age("abc")
    assert False, "should raise InvalidAge"
except InvalidAge as e:
    assert isinstance(e.__cause__, ValueError), "use raise ... from err"
    assert e.field == "age"` },
    ],
    hints: [
      'In ValidationError.__init__, call super().__init__(message) and then set self.field = field. InvalidName and InvalidAge can define their own __init__(self, message) that calls super().__init__("name", message).',
      'parse_age: try: return int(text) except ValueError as err: raise InvalidAge("age must be a number") from err. In register, beware that bool is a subclass of int if you want to be strict (not required).',
    ],
    solution: `class AppError(Exception):
    pass


class ValidationError(AppError):
    def __init__(self, field, message):
        super().__init__(message)
        self.field = field


class InvalidName(ValidationError):
    def __init__(self, message):
        super().__init__("name", message)


class InvalidAge(ValidationError):
    def __init__(self, message):
        super().__init__("age", message)


def parse_age(text):
    try:
        return int(text)
    except ValueError as err:
        raise InvalidAge("age must be a number") from err


class UserService:
    def register(self, name, age):
        if not isinstance(name, str) or not name:
            raise InvalidName("name must be a non-empty string")
        if not isinstance(age, int) or not 0 <= age <= 150:
            raise InvalidAge("age must be an int between 0 and 150")
        return {"name": name, "age": age}
`,
    explanation: `**A hierarchy with data.** \`AppError\` is the family root; \`ValidationError\` adds a \`field\` attribute so a UI can highlight the right input without parsing text; the two leaf classes let callers react to exactly one failure. \`except ValidationError\` handles both, and \`except AppError\` handles everything.

**Chaining.** \`raise InvalidAge(...) from err\` stores the original \`ValueError\` in \`__cause__\`, translating a low-level error into a domain error without hiding why it happened. In C++ the nearest tool is \`std::throw_with_nested\`.`,
  },
  {
    id: 'exceptions-e04', lang: 'python', title: 'A retry helper', difficulty: 2,
    task: `Write \`retry(func, attempts, exceptions=(IOError,))\`.

- It calls \`func()\` up to \`attempts\` times and returns the first successful result.
- Only exceptions that are instances of \`exceptions\` trigger a retry. Any other exception propagates immediately without further attempts.
- If every attempt fails with a listed exception, re-raise the **last** one.
- \`attempts < 1\` raises \`ValueError\`.

~~~python
retry(lambda: fetch(), 3)                       # tries up to 3 times
retry(lambda: parse(), 5, exceptions=(KeyError,))
~~~`,
    starter: `def retry(func, attempts, exceptions=(IOError,)):
    raise NotImplementedError
`,
    tests: [
      { name: 'returns on first success', code: `calls = []
def ok():
    calls.append(1)
    return "done"
assert retry(ok, 3) == "done"
assert len(calls) == 1` },
      { name: 'retries listed exceptions then succeeds', code: `state = {"n": 0}
def flaky():
    state["n"] += 1
    if state["n"] < 3:
        raise IOError("temporary " + str(state["n"]))
    return state["n"]
assert retry(flaky, 5) == 3
assert state["n"] == 3` },
      { name: 'raises the last error after exhausting attempts', code: `state = {"n": 0}
def always():
    state["n"] += 1
    raise IOError("fail " + str(state["n"]))
try:
    retry(always, 3)
    assert False, "should re-raise"
except IOError as e:
    assert str(e) == "fail 3", "should re-raise the last error"
assert state["n"] == 3` },
      { name: 'unlisted exceptions are not retried', code: `state = {"n": 0}
def bad():
    state["n"] += 1
    raise ValueError("nope")
try:
    retry(bad, 5)
    assert False, "ValueError should propagate"
except ValueError:
    pass
assert state["n"] == 1
try:
    retry(bad, 0)
    assert False, "attempts < 1 must raise ValueError"
except ValueError:
    pass
state["n"] = 0
try:
    retry(bad, 4, exceptions=(ValueError, KeyError))
except ValueError:
    pass
assert state["n"] == 4` },
    ],
    hints: [
      'Loop for attempt in range(attempts) and wrap func() in try/except exceptions as e.',
      'Remember the exception in a variable (last = e) and re-raise it after the loop with raise last. Check attempts < 1 first. Exceptions not in the tuple are simply not caught.',
    ],
    solution: `def retry(func, attempts, exceptions=(IOError,)):
    if attempts < 1:
        raise ValueError("attempts must be at least 1")
    last = None
    for _ in range(attempts):
        try:
            return func()
        except exceptions as e:
            last = e
    raise last
`,
    explanation: `**Catch exactly what you can handle.** \`except exceptions\` accepts a tuple, so only the listed (transient) error types trigger a retry; a \`ValueError\` is a bug and propagates at once instead of being retried.

**Preserve the failure.** Remembering the last exception and re-raising it keeps the original type, message and traceback for the caller. Note that Python deletes the name bound by \`except ... as e\` when the block ends, so we copy it into \`last\` first. In C++ the same function would catch \`const std::exception&\` types by reference and store a \`std::exception_ptr\`.`,
  },
];
