export default [
  {
    id: 'encapsulation-e01', lang: 'cpp', title: 'A bank account that guards its balance', difficulty: 1,
    task: `Build a bank account that protects its invariant: **the balance is never negative**.

- \`class BankAccount\`, with the balance stored in a **private** data member.
  - \`explicit BankAccount(double initial = 0)\` throws \`std::invalid_argument\` if \`initial\` is negative.
  - \`void deposit(double amount)\` adds \`amount\`. Throws \`std::invalid_argument\` if \`amount <= 0\`.
  - \`void withdraw(double amount)\` subtracts \`amount\`. Throws \`std::invalid_argument\` if \`amount <= 0\` or if \`amount\` is greater than the balance (withdrawing the exact balance is fine).
  - \`double balance() const\` returns the balance **by value**, so callers can read it but not modify it.
  - \`int transactionCount() const\` returns how many deposits and withdrawals **succeeded**. Failed calls and the constructor do not count.

After a failed call the account must be exactly as it was: same balance, same count. Validate first, then change state.

~~~cpp
BankAccount acct(100);
acct.deposit(50);          // balance 150
acct.withdraw(30);         // balance 120
acct.withdraw(500);        // throws std::invalid_argument; balance is still 120
acct.transactionCount();   // 2
~~~`,
    starter: `#include <stdexcept>

class BankAccount {
public:
    explicit BankAccount(double initial = 0) {
        // TODO: reject a negative initial balance, then store it
    }

    void deposit(double amount) {
        // TODO: validate, then add and count the transaction
    }

    void withdraw(double amount) {
        // TODO: validate (non-positive amount or overdraft), then subtract and count
    }

    double balance() const {
        return 0;  // TODO
    }

    int transactionCount() const {
        return 0;  // TODO
    }

private:
    // TODO: private data members
};
`,
    tests: [
      { name: 'interface: explicit constructor, read-only const getters', code: `EXPECT((!std::is_convertible_v<double, BankAccount>));
auto constReadable = [](const auto& a) { return requires { a.balance(); a.transactionCount(); }; };
EXPECT(constReadable(BankAccount(5)));
BankAccount acct;
using Balance = decltype(acct.balance());
EXPECT((!std::is_assignable_v<Balance, double>));` },
      { name: 'deposit and withdraw update the balance', code: `BankAccount a(100);
a.deposit(50);
EXPECT_NEAR(a.balance(), 150, 1e-9);
a.withdraw(30);
EXPECT_NEAR(a.balance(), 120, 1e-9);
BankAccount b;
EXPECT_NEAR(b.balance(), 0, 1e-9);` },
      { name: 'withdrawing the whole balance is allowed', code: `BankAccount a(40);
a.withdraw(40);
EXPECT_NEAR(a.balance(), 0, 1e-9);` },
      { name: 'non-positive amounts throw invalid_argument', code: `BankAccount a(100);
EXPECT_THROWS(a.deposit(0), std::invalid_argument);
EXPECT_THROWS(a.deposit(-5), std::invalid_argument);
EXPECT_THROWS(a.withdraw(0), std::invalid_argument);
EXPECT_THROWS(a.withdraw(-5), std::invalid_argument);
EXPECT_NEAR(a.balance(), 100, 1e-9);` },
      { name: 'an overdraft throws and changes nothing', code: `BankAccount a(100);
a.deposit(20);
EXPECT_THROWS(a.withdraw(120.01), std::invalid_argument);
EXPECT_NEAR(a.balance(), 120, 1e-9);
EXPECT_EQ(a.transactionCount(), 1);` },
      { name: 'a negative opening balance is rejected', code: `EXPECT_THROWS(BankAccount(-1), std::invalid_argument);
BankAccount ok(0);
EXPECT_NEAR(ok.balance(), 0, 1e-9);` },
      { name: 'transactionCount counts only successes', code: `BankAccount a(10);
EXPECT_EQ(a.transactionCount(), 0);
a.deposit(5);
a.withdraw(3);
try { a.withdraw(1000); } catch (const std::invalid_argument&) {}
try { a.deposit(-1); } catch (const std::invalid_argument&) {}
a.deposit(1);
EXPECT_EQ(a.transactionCount(), 3);
EXPECT_NEAR(a.balance(), 13, 1e-9);` },
    ],
    hints: [
      'Keep two private members, `double balance_;` and `int transactions_ = 0;`, and make every check happen *before* either of them changes.',
      'In `withdraw`, test both failure conditions first: `if (amount <= 0 || amount > balance_) throw std::invalid_argument("...");`. Only after the check run `balance_ -= amount; ++transactions_;`.',
      'The constructor can validate in its body: `explicit BankAccount(double initial = 0) : balance_(initial) { if (initial < 0) throw std::invalid_argument("negative opening balance"); }`. If a constructor throws, no object is created at all.',
    ],
    solution: `#include <stdexcept>

class BankAccount {
public:
    explicit BankAccount(double initial = 0) : balance_(initial) {
        if (initial < 0) throw std::invalid_argument("opening balance cannot be negative");
    }

    void deposit(double amount) {
        if (amount <= 0) throw std::invalid_argument("deposit must be positive");
        balance_ += amount;
        ++transactions_;
    }

    void withdraw(double amount) {
        if (amount <= 0) throw std::invalid_argument("withdrawal must be positive");
        if (amount > balance_) throw std::invalid_argument("insufficient funds");
        balance_ -= amount;
        ++transactions_;
    }

    double balance() const { return balance_; }

    int transactionCount() const { return transactions_; }

private:
    double balance_;
    int transactions_ = 0;
};
`,
    explanation: `**The constructor establishes the invariant.** If \`initial\` is negative the constructor throws, so a \`BankAccount\` with a negative balance can never exist. From then on, every public member function only has to *preserve* the rule.

**Every change goes through checked operations.** \`balance_\` is private, so \`deposit\` and \`withdraw\` are the only code that can modify it. Each validates its argument first and changes state only afterwards, so a failed call throws before anything is touched and the balance and count stay as they were (Module 16 calls this the *strong exception guarantee*).

**Read-only access.** \`balance()\` and \`transactionCount()\` are \`const\` and return by value: callers can look, not touch. \`transactionCount\` also shows a payoff of encapsulation: because all changes funnel through two functions, counting them is trivial. With a public \`balance\` field, it would be impossible.

One real-world note: financial code stores integer cents (or a decimal type) rather than \`double\`, which cannot represent amounts like 0.10 exactly.`,
  },
  {
    id: 'encapsulation-e02', lang: 'cpp', title: 'Temperature with one source of truth', difficulty: 2,
    task: `Write a \`Temperature\` class that stores **one** value, in kelvin, and converts on demand.

- Exactly one private data member, \`double kelvin_\`, so that \`sizeof(Temperature) == sizeof(double)\`. The other scales are computed, never stored.
- \`Temperature()\` starts at 0 °C (273.15 K).
- Getters, all \`const\`: \`double kelvin() const\`, \`double celsius() const\`, \`double fahrenheit() const\`.
- Setters: \`void setKelvin(double k)\`, \`void setCelsius(double c)\`, \`void setFahrenheit(double f)\`. Each throws \`std::out_of_range\` if the new temperature would be below absolute zero (0 K = -273.15 °C), and then leaves the stored value unchanged. Exactly 0 K (for example \`setKelvin(0)\` or \`setCelsius(-273.15)\`) is allowed.

Conversions: \`C = K - 273.15\` and \`F = C * 9 / 5 + 32\`.

~~~cpp
Temperature t;          // 0 °C
t.fahrenheit();         // 32
t.setCelsius(100);
t.kelvin();             // 373.15
t.setFahrenheit(-40);
t.celsius();            // -40
t.setCelsius(-300);     // throws std::out_of_range; t.celsius() is still -40
~~~`,
    starter: `#include <stdexcept>

class Temperature {
public:
    Temperature() {}  // TODO: start at 0 degrees Celsius (273.15 K)

    double kelvin() const { return 0; }      // TODO
    double celsius() const { return 0; }     // TODO
    double fahrenheit() const { return 0; }  // TODO

    void setKelvin(double k) {
        // TODO: throw std::out_of_range below 0 K, otherwise store k
    }

    void setCelsius(double c) {
        // TODO: convert to kelvin and reuse setKelvin
    }

    void setFahrenheit(double f) {
        // TODO: convert to Celsius and reuse setCelsius
    }

private:
    double kelvin_ = 0;
};
`,
    tests: [
      { name: 'one double member, const getters', code: `EXPECT_EQ(sizeof(Temperature), sizeof(double));
auto constReadable = [](const auto& t) { return requires { t.kelvin(); t.celsius(); t.fahrenheit(); }; };
EXPECT(constReadable(Temperature()));` },
      { name: 'the default is 0 degrees Celsius', code: `Temperature t;
EXPECT_NEAR(t.celsius(), 0, 1e-9);
EXPECT_NEAR(t.kelvin(), 273.15, 1e-9);
EXPECT_NEAR(t.fahrenheit(), 32, 1e-9);` },
      { name: 'setCelsius converts to every scale', code: `Temperature t;
t.setCelsius(100);
EXPECT_NEAR(t.kelvin(), 373.15, 1e-9);
EXPECT_NEAR(t.fahrenheit(), 212, 1e-9);
t.setCelsius(-40);
EXPECT_NEAR(t.fahrenheit(), -40, 1e-9);` },
      { name: 'setFahrenheit and setKelvin', code: `Temperature t;
t.setFahrenheit(212);
EXPECT_NEAR(t.celsius(), 100, 1e-9);
t.setFahrenheit(32);
EXPECT_NEAR(t.kelvin(), 273.15, 1e-9);
t.setKelvin(0);
EXPECT_NEAR(t.celsius(), -273.15, 1e-9);
EXPECT_NEAR(t.fahrenheit(), -459.67, 1e-9);` },
      { name: 'absolute zero itself is allowed', code: `Temperature t;
t.setCelsius(-273.15);
EXPECT_NEAR(t.kelvin(), 0, 1e-9);` },
      { name: 'below absolute zero throws out_of_range', code: `Temperature t;
EXPECT_THROWS(t.setKelvin(-0.01), std::out_of_range);
EXPECT_THROWS(t.setCelsius(-273.2), std::out_of_range);
EXPECT_THROWS(t.setFahrenheit(-460), std::out_of_range);` },
      { name: 'a failed set changes nothing', code: `Temperature t;
t.setCelsius(25);
try { t.setCelsius(-300); } catch (const std::out_of_range&) {}
try { t.setFahrenheit(-1000); } catch (const std::out_of_range&) {}
try { t.setKelvin(-1); } catch (const std::out_of_range&) {}
EXPECT_NEAR(t.celsius(), 25, 1e-9);` },
    ],
    hints: [
      'Store only `kelvin_`. `celsius()` is `kelvin_ - 273.15`, and `fahrenheit()` can be written in terms of `celsius()`: `celsius() * 9.0 / 5.0 + 32.0`.',
      'Put the absolute-zero check in exactly one setter: `setKelvin` throws `std::out_of_range` when `k < 0`, and otherwise stores `k`.',
      'The other setters convert and delegate: `setCelsius(c)` calls `setKelvin(c + 273.15)`, and `setFahrenheit(f)` calls `setCelsius((f - 32.0) * 5.0 / 9.0)`. Initialize `kelvin_` to `273.15` so the default is 0 °C.',
    ],
    solution: `#include <stdexcept>

class Temperature {
public:
    Temperature() = default;

    double kelvin() const { return kelvin_; }
    double celsius() const { return kelvin_ - 273.15; }
    double fahrenheit() const { return celsius() * 9.0 / 5.0 + 32.0; }

    void setKelvin(double k) {
        if (k < 0) throw std::out_of_range("below absolute zero");
        kelvin_ = k;
    }

    void setCelsius(double c) { setKelvin(c + 273.15); }

    void setFahrenheit(double f) { setCelsius((f - 32.0) * 5.0 / 9.0); }

private:
    double kelvin_ = 273.15;   // 0 degrees Celsius
};
`,
    explanation: `**A single source of truth.** Storing kelvin, Celsius and Fahrenheit side by side would create a new invariant, "the three values agree", that every setter would have to maintain. Storing one value and computing the others makes that kind of inconsistency impossible. The \`sizeof\` test checks exactly this design decision.

**Validation in one place.** \`setCelsius\` and \`setFahrenheit\` only convert and then delegate to \`setKelvin\`, so the absolute-zero rule is written once. Because \`setKelvin\` throws *before* assigning \`kelvin_\`, a rejected value leaves the object unchanged.

**The representation is a private detail.** Callers never learn that kelvin is what is stored. You could switch to storing Celsius tomorrow, and not a single caller would change: encapsulation is what makes the internals replaceable. Python expresses the same design with properties, as the next exercises show.`,
  },
  {
    id: 'encapsulation-e03', lang: 'python', title: 'Read-only balance and a safe history', difficulty: 1,
    task: `Build a Python bank account whose balance can only change through its methods.

- \`BankAccount(opening=0)\` raises \`ValueError\` if \`opening\` is negative.
- \`balance\` is a **read-only property** (a \`@property\` with no setter), so \`acct.balance = 10\` raises \`AttributeError\`. Keep the value in an internal attribute such as \`self._balance\`.
- \`deposit(amount)\` raises \`ValueError\` if \`amount <= 0\`; otherwise it adds the amount.
- \`withdraw(amount)\` raises \`ValueError\` if \`amount <= 0\` or \`amount > balance\` (withdrawing the exact balance is fine); otherwise it subtracts the amount.
- \`history()\` returns a **new list** of the successful transactions, oldest first, as tuples \`("deposit", amount)\` or \`("withdraw", amount)\`. The opening balance is not a transaction. Changing the returned list must not affect the account.

A failed call must leave both the balance and the history unchanged.

~~~python
acct = BankAccount(100)
acct.deposit(50)
acct.withdraw(30)
acct.balance          # 120
acct.history()        # [('deposit', 50), ('withdraw', 30)]
acct.withdraw(500)    # raises ValueError
acct.balance = 0      # raises AttributeError
~~~`,
    starter: `class BankAccount:
    def __init__(self, opening=0):
        raise NotImplementedError

    @property
    def balance(self):
        raise NotImplementedError

    def deposit(self, amount):
        raise NotImplementedError

    def withdraw(self, amount):
        raise NotImplementedError

    def history(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'balance is a read-only property', code: `assert isinstance(getattr(BankAccount, "balance", None), property), "balance must be a @property defined on the class"
assert BankAccount.balance.fset is None, "balance must not have a setter"
acct = BankAccount(10)
try:
    acct.balance = 0
except AttributeError:
    pass
else:
    raise AssertionError("assigning to balance should raise AttributeError")
assert acct.balance == 10, f"expected 10, got {acct.balance!r}"` },
      { name: 'deposit and withdraw update the balance', code: `acct = BankAccount(100)
acct.deposit(50)
acct.withdraw(30)
assert acct.balance == 120, f"expected 120, got {acct.balance!r}"
assert BankAccount().balance == 0, "the opening balance defaults to 0"` },
      { name: 'withdrawing the whole balance is allowed', code: `acct = BankAccount(40)
acct.withdraw(40)
assert acct.balance == 0, f"expected 0, got {acct.balance!r}"` },
      { name: 'non-positive amounts raise ValueError', code: `acct = BankAccount(100)
for bad in (0, -5):
    for op in (acct.deposit, acct.withdraw):
        try:
            op(bad)
        except ValueError:
            pass
        else:
            raise AssertionError(f"{op.__name__}({bad}) should raise ValueError")
assert acct.balance == 100, "failed calls must not change the balance"` },
      { name: 'an overdraft raises and changes nothing', code: `acct = BankAccount(100)
acct.deposit(20)
try:
    acct.withdraw(120.01)
except ValueError:
    pass
else:
    raise AssertionError("an overdraft should raise ValueError")
assert acct.balance == 120, f"expected 120, got {acct.balance!r}"
assert acct.history() == [("deposit", 20)], f"got {acct.history()!r}"` },
      { name: 'a negative opening balance is rejected', code: `try:
    BankAccount(-1)
except ValueError:
    pass
else:
    raise AssertionError("BankAccount(-1) should raise ValueError")` },
      { name: 'history records successes in order', code: `acct = BankAccount(10)
assert acct.history() == [], "the opening balance is not a transaction"
acct.deposit(5)
acct.withdraw(3)
assert acct.history() == [("deposit", 5), ("withdraw", 3)], f"got {acct.history()!r}"` },
      { name: 'history() returns a copy', code: `acct = BankAccount()
acct.deposit(5)
h = acct.history()
assert isinstance(h, list), "history() should return a list"
h.append(("deposit", 1000))
h.clear()
assert acct.history() == [("deposit", 5)], "changing the returned list must not affect the account"
assert acct.history() is not acct.history(), "history() should return a new list on every call"
assert acct.balance == 5` },
    ],
    hints: [
      'Store the data in `self._balance` and `self._history = []`. Define `balance` with `@property` and give it **no** setter: that alone makes `acct.balance = 0` raise `AttributeError`.',
      'In `withdraw`, raise first: `if amount <= 0 or amount > self._balance: raise ValueError(...)`. Only then update `self._balance` and append `("withdraw", amount)` to `self._history`.',
      '`history()` must not hand out `self._history` itself. `return list(self._history)` builds a new list each time; the tuples inside are immutable, so a shallow copy is enough.',
    ],
    solution: `class BankAccount:
    def __init__(self, opening=0):
        if opening < 0:
            raise ValueError("opening balance cannot be negative")
        self._balance = opening
        self._history = []

    @property
    def balance(self):
        return self._balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("deposit must be positive")
        self._balance += amount
        self._history.append(("deposit", amount))

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("withdrawal must be positive")
        if amount > self._balance:
            raise ValueError("insufficient funds")
        self._balance -= amount
        self._history.append(("withdraw", amount))

    def history(self):
        return list(self._history)
`,
    explanation: `**A read-only property.** \`balance\` offers attribute syntax (\`acct.balance\`) but has no setter, so assigning to it raises \`AttributeError\`. The only way to change \`_balance\` is through \`deposit\` and \`withdraw\`, and both validate *before* touching any state, so a failed call leaves the balance and the history exactly as they were.

**A defensive copy.** \`history()\` returns \`list(self._history)\`. Returning \`self._history\` would hand callers the internal list itself, and \`acct.history().clear()\` would silently erase the account's records. A shallow copy is enough here because the tuples inside are immutable.

**Convention, not enforcement.** Nothing stops determined code from writing \`acct._balance = -5\`; the underscore says "internal, hands off". Python's encapsulation guards against accidents and documents intent, while C++'s \`private\` has the compiler enforce it. Either way, the invariant is kept by one class instead of by every caller.`,
  },
  {
    id: 'encapsulation-e04', lang: 'python', title: 'Temperature properties', difficulty: 2,
    task: `Build a \`Temperature\` class with three properties that always agree, because only **one** value is stored.

- \`Temperature(celsius=0.0)\`: the initial value goes through the same validation as the \`celsius\` setter.
- \`celsius\`: a property with a getter **and** a setter. The setter raises \`ValueError\` if the value is below absolute zero (\`-273.15\`), leaving the stored value unchanged. Exactly \`-273.15\` is allowed.
- \`fahrenheit\`: a property with a getter and a setter, where \`F = C * 9 / 5 + 32\`. The setter converts to Celsius and is validated by the same rule, so \`t.fahrenheit = -500\` raises \`ValueError\`.
- \`kelvin\`: a **read-only** property, \`K = C + 273.15\`. Assigning to it raises \`AttributeError\`.
- Store exactly **one** instance attribute (for example \`self._celsius\`); the other scales are computed on access.

~~~python
t = Temperature(100)
t.fahrenheit          # 212.0
t.fahrenheit = 32
t.celsius             # 0.0
t.kelvin              # 273.15
t.celsius = -300      # raises ValueError
t.kelvin = 0          # raises AttributeError
~~~`,
    starter: `class Temperature:
    def __init__(self, celsius=0.0):
        raise NotImplementedError

    @property
    def celsius(self):
        raise NotImplementedError

    @celsius.setter
    def celsius(self, value):
        raise NotImplementedError

    @property
    def fahrenheit(self):
        raise NotImplementedError

    @fahrenheit.setter
    def fahrenheit(self, value):
        raise NotImplementedError

    @property
    def kelvin(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'the three properties have the right shape', code: `for name in ("celsius", "fahrenheit", "kelvin"):
    assert isinstance(getattr(Temperature, name, None), property), f"{name} must be a property"
assert Temperature.celsius.fset is not None, "celsius needs a setter"
assert Temperature.fahrenheit.fset is not None, "fahrenheit needs a setter"
assert Temperature.kelvin.fset is None, "kelvin must be read-only (no setter)"` },
      { name: 'stores a single instance attribute', code: `t = Temperature(25)
assert len(vars(t)) == 1, f"store exactly one instance attribute, found {sorted(vars(t))}"` },
      { name: 'celsius getter, setter and default', code: `assert abs(Temperature().celsius) < 1e-9, "the default is 0 degrees Celsius"
t = Temperature(25)
assert abs(t.celsius - 25) < 1e-9, f"got {t.celsius!r}"
t.celsius = 30
assert abs(t.celsius - 30) < 1e-9, f"got {t.celsius!r}"` },
      { name: 'fahrenheit is computed', code: `t = Temperature(100)
assert abs(t.fahrenheit - 212) < 1e-9, f"got {t.fahrenheit!r}"
t.celsius = -40
assert abs(t.fahrenheit - (-40)) < 1e-9, f"got {t.fahrenheit!r}"` },
      { name: 'the fahrenheit setter converts', code: `t = Temperature()
t.fahrenheit = 212
assert abs(t.celsius - 100) < 1e-9, f"got {t.celsius!r}"
t.fahrenheit = 32
assert abs(t.celsius) < 1e-9, f"got {t.celsius!r}"` },
      { name: 'kelvin is computed and read-only', code: `t = Temperature(0)
assert abs(t.kelvin - 273.15) < 1e-9, f"got {t.kelvin!r}"
t.celsius = -273.15
assert abs(t.kelvin) < 1e-9, "exactly absolute zero is allowed"
try:
    t.kelvin = 5
except AttributeError:
    pass
else:
    raise AssertionError("assigning to kelvin should raise AttributeError")` },
      { name: 'below absolute zero raises and changes nothing', code: `t = Temperature(20)
for attr, bad in (("celsius", -273.16), ("fahrenheit", -500)):
    try:
        setattr(t, attr, bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"setting {attr} to {bad} should raise ValueError")
assert abs(t.celsius - 20) < 1e-9, "a rejected value must leave the temperature unchanged"` },
      { name: 'the constructor validates too', code: `try:
    Temperature(-300)
except ValueError:
    pass
else:
    raise AssertionError("Temperature(-300) should raise ValueError")` },
    ],
    hints: [
      'Store a single attribute, `self._celsius`. In `__init__`, assign through the property (`self.celsius = celsius`) so the constructor is validated by the setter.',
      'The `celsius` setter raises `ValueError` when `value < -273.15` and only otherwise assigns `self._celsius = value`. Assigning `self.celsius` inside its own setter would recurse forever.',
      '`fahrenheit` returns `self._celsius * 9 / 5 + 32`, and its setter is just `self.celsius = (value - 32) * 5 / 9`, which reuses the validation. `kelvin` is a getter-only property returning `self._celsius + 273.15`.',
    ],
    solution: `class Temperature:
    ABSOLUTE_ZERO_C = -273.15

    def __init__(self, celsius=0.0):
        self.celsius = celsius            # validated by the setter

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, value):
        if value < Temperature.ABSOLUTE_ZERO_C:
            raise ValueError(f"{value} is below absolute zero")
        self._celsius = value

    @property
    def fahrenheit(self):
        return self._celsius * 9 / 5 + 32

    @fahrenheit.setter
    def fahrenheit(self, value):
        self.celsius = (value - 32) * 5 / 9   # reuse the celsius validation

    @property
    def kelvin(self):
        return self._celsius - Temperature.ABSOLUTE_ZERO_C
`,
    explanation: `**One stored value, three views.** Only \`_celsius\` lives in the instance; \`fahrenheit\` and \`kelvin\` are computed on every access, so they can never disagree or go stale. Callers still use plain attribute syntax (\`t.fahrenheit\`), unaware of which value is stored: that is encapsulation of the representation.

**Validation in one place.** The \`fahrenheit\` setter converts and then assigns \`self.celsius\`, which runs the \`celsius\` setter, and \`__init__\` does the same. Every path into the object therefore passes through a single check, and because that check raises *before* assigning, a rejected value leaves the object unchanged.

**Read-only by omission.** \`kelvin\` has no setter, so \`t.kelvin = 0\` raises \`AttributeError\`. Compare this with the C++ version of the exercise: C++ needs explicit \`celsius()\` / \`setCelsius()\` functions, while Python's \`@property\` keeps attribute syntax and still runs your code on every read and write.`,
  },
];
