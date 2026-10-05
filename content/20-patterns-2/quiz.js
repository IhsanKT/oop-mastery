export default [
  {
    id: 'patterns-2-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'What is the intent of the Strategy pattern?',
    options: [
      { text: 'Define a family of interchangeable algorithms and let the client pick one at run time.', correct: true, why: 'Correct: the context delegates to a strategy object (or function) that can be swapped.' },
      { text: 'Guarantee only one instance of an algorithm exists.', correct: false, why: 'That is Singleton; strategies can have many instances and are usually cheap objects.' },
      { text: 'Notify many objects when one object changes.', correct: false, why: 'That describes Observer, not Strategy.' },
      { text: 'Record every request so it can be undone.', correct: false, why: 'That is Command; Strategy is about choosing how something is computed.' },
    ],
    explanation: `A **Strategy** encapsulates one algorithm behind a common interface (a class with one method, or just a function in Python). The context holds a strategy and calls it, so changing behaviour means passing a different one, with no \`if/elif\` chain in the context.`,
  },
  {
    id: 'patterns-2-q02', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'Functions are used as strategies. What does this program print?',
    codeLang: 'python',
    code: `def double(x): return x * 2
def square(x): return x * x

class Calc:
    def __init__(self, f): self.f = f
    def run(self, x): return self.f(x)

c = Calc(double)
a = c.run(5)
c.f = square
b = c.run(5)
print(a, b)`,
    options: [
      { text: '10 25', correct: true, why: 'Correct: the strategy was swapped between the two calls, so each used a different function.' },
      { text: '10 10', correct: false, why: 'Assigning c.f replaces the strategy stored on the object; the second call uses square.' },
      { text: '25 25', correct: false, why: 'a was computed before the swap, so it holds the result of double.' },
      { text: 'TypeError', correct: false, why: 'Functions are objects; storing and calling them through an attribute is ordinary Python.' },
    ],
    explanation: `In Python a function is a perfectly good strategy: it is an object you can store, pass and replace. \`Calc\` never learns which algorithm it uses, only that it is callable. That is why the Strategy pattern is often just "pass a function".`,
  },
  {
    id: 'patterns-2-q03', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What order do the observers run in?',
    codeLang: 'cpp',
    code: `class Subject {
    std::vector<std::function<void(int)>> obs;
public:
    void subscribe(std::function<void(int)> f) { obs.push_back(std::move(f)); }
    void notify(int v) { for (auto& f : obs) f(v); }
};

Subject s;
s.subscribe([](int v) { std::cout << "A" << v << " "; });
s.subscribe([](int v) { std::cout << "B" << v << " "; });
s.notify(1);
s.notify(2);`,
    options: [
      { text: 'A1 B1 A2 B2', correct: true, why: 'Correct: each notify visits the observers in subscription order.' },
      { text: 'A1 A2 B1 B2', correct: false, why: 'notify loops over all observers for one value before the next notify begins.' },
      { text: 'B1 A1 B2 A2', correct: false, why: 'Observers are stored in a vector and called in insertion order, not reverse order.' },
      { text: 'The order is unspecified.', correct: false, why: 'This implementation iterates a vector, so the order is deterministic (though real APIs may not promise it).' },
    ],
    explanation: `The subject keeps observers in a \`std::vector\` and loops over it, so they are called in the order they subscribed. Many observer APIs deliberately **do not promise** an order, so well-designed observers should not depend on one.`,
  },
  {
    id: 'patterns-2-q04', lang: 'both', type: 'bug', difficulty: 2,
    prompt: 'A long-running app creates a short-lived `Dashboard` view per screen and calls `model.subscribe(view.refresh)`, but never unsubscribes. Memory keeps growing. What is the problem?',
    options: [
      { text: 'The lapsed-listener leak: the subject holds strong references so closed views are never freed.', correct: true, why: 'Correct: a subscription keeps the observer alive and keeps calling it; unsubscribe or hold it weakly.' },
      { text: 'Observers are copied on every notification.', correct: false, why: 'Copying is not the cause; the leak is the references the subject keeps to dead views.' },
      { text: 'The Observer pattern cannot be used in long-running programs.', correct: false, why: 'It is widely used; the fix is lifecycle management of subscriptions.' },
      { text: 'Python garbage collection does not work with callbacks.', correct: false, why: 'The GC works, but a reachable object (held by the subject) is by definition not garbage.' },
    ],
    explanation: `The subject's list of callbacks keeps every subscribed view reachable, so the garbage collector (or a C++ owner) cannot release it, and each stale view still receives notifications. Provide \`unsubscribe\`, return a handle/token, or store observers weakly (\`weakref.WeakMethod\`, \`std::weak_ptr\`).`,
  },
  {
    id: 'patterns-2-q05', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'What does `log` contain at the end?',
    codeLang: 'python',
    code: `class Bus:
    def __init__(self): self.subs = []
    def subscribe(self, fn): self.subs.append(fn)
    def unsubscribe(self, fn): self.subs.remove(fn)
    def publish(self, m):
        for fn in list(self.subs):
            fn(m)

log = []
a = lambda m: log.append("a:" + m)
b = lambda m: log.append("b:" + m)
bus = Bus()
bus.subscribe(a)
bus.subscribe(b)
bus.publish("1")
bus.unsubscribe(a)
bus.publish("2")`,
    options: [
      { text: "['a:1', 'b:1', 'b:2']", correct: true, why: 'Correct: a received only the first message; after unsubscribing, only b is called.' },
      { text: "['a:1', 'b:1', 'a:2', 'b:2']", correct: false, why: 'unsubscribe removed a before the second publish, so a is not called again.' },
      { text: "['b:1', 'b:2']", correct: false, why: 'a was still subscribed during the first publish, so it logged a:1.' },
      { text: "['a:1', 'b:1']", correct: false, why: 'b is still subscribed for the second publish and logs b:2.' },
    ],
    explanation: `Unsubscribing takes effect for **later** notifications. Iterating over \`list(self.subs)\` (a copy) also makes it safe for an observer to unsubscribe itself during a publish, which would otherwise skip elements of the list being iterated.`,
  },
  {
    id: 'patterns-2-q06', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'What is the intent of the Command pattern?',
    options: [
      { text: 'Encapsulate a request as an object so it can be stored, queued, logged or undone.', correct: true, why: 'Correct: the request becomes data with execute (and often undo) operations.' },
      { text: 'Let an object change behaviour when its state changes.', correct: false, why: 'That is State, which models mode-dependent behaviour.' },
      { text: 'Provide a way to traverse a collection.', correct: false, why: 'That describes Iterator, which is about traversal, not requests.' },
      { text: 'Hide a complex subsystem behind a simple class.', correct: false, why: 'That is Facade; Command is about reifying actions.' },
    ],
    explanation: `A **Command** turns "do this" into an object that knows its receiver and arguments. Once requests are objects you can put them in a queue, write them to a log, replay them or call \`undo()\`.`,
  },
  {
    id: 'patterns-2-q07', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Doc:
    def __init__(self): self.text = ""

class Append:
    def __init__(self, doc, s): self.doc, self.s = doc, s
    def execute(self): self.doc.text += self.s
    def undo(self): self.doc.text = self.doc.text[:-len(self.s)]

doc = Doc()
undo_stack = []
for s in ["Hello", ", ", "world"]:
    cmd = Append(doc, s)
    cmd.execute()
    undo_stack.append(cmd)

undo_stack.pop().undo()
undo_stack.pop().undo()
print(repr(doc.text))`,
    options: [
      { text: "'Hello'", correct: true, why: 'Correct: the last two commands (", " and "world") were undone in reverse order.' },
      { text: "'Hello, '", correct: false, why: 'Two undos remove two commands, not one: the ", " append is undone as well.' },
      { text: "'Hello, world'", correct: false, why: 'Popping from the stack and calling undo reverses the commands; nothing stays applied.' },
      { text: "''", correct: false, why: 'Only two of the three commands were undone, so the first append, "Hello", remains.' },
    ],
    explanation: `The undo stack is **LIFO**: the most recent command is undone first. After three executes the text is \`"Hello, world"\`; undoing "world" gives \`"Hello, "\` and undoing ", " gives \`"Hello"\`. A redo stack would receive each undone command so it can be re-executed.`,
  },
  {
    id: 'patterns-2-q08', lang: 'both', type: 'compare', difficulty: 2,
    prompt: 'How does Template Method differ from Strategy?',
    options: [
      { text: 'Template Method varies steps via inheritance; Strategy varies the whole algorithm via composition and can change at run time.', correct: true, why: 'Correct: one uses a base-class skeleton with hooks, the other a swappable collaborator.' },
      { text: 'They are the same pattern with different names.', correct: false, why: 'They solve similar problems differently: inheritance and compile-time binding versus composition.' },
      { text: 'Template Method works only in C++.', correct: false, why: 'Python base classes with overridable methods implement it just as well.' },
      { text: 'Strategy requires inheritance but Template Method does not.', correct: false, why: 'It is the other way round: Template Method relies on subclassing; Strategy can be a plain function.' },
    ],
    explanation: `**Template Method**: the base class owns the algorithm skeleton (\`run()\` calls \`step1(); hook(); step3();\`) and subclasses override steps. **Strategy**: the context owns no algorithm; it calls an injected object. Prefer Strategy when you need run-time swapping or want to avoid deep inheritance.`,
  },
  {
    id: 'patterns-2-q09', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>

struct Base {
    virtual ~Base() = default;
    void run() {
        std::cout << "start ";
        step();
        std::cout << "end";
    }
    virtual void step() { std::cout << "base "; }
};

struct Derived : Base {
    void step() override { std::cout << "derived "; }
};

int main() {
    Derived d;
    d.run();
    std::cout << "\\n";
}`,
    options: [
      { text: 'start derived end', correct: true, why: 'Correct: run() is the fixed skeleton, and the virtual step() call dispatches to the override.' },
      { text: 'start base end', correct: false, why: 'step() is virtual, so even a call from inside Base::run() uses the derived override.' },
      { text: 'derived start end', correct: false, why: 'The skeleton controls order: "start " is printed before the hook is invoked.' },
      { text: 'start end', correct: false, why: 'The hook is always called by the skeleton; an override does not remove the step.' },
    ],
    explanation: `This is **Template Method**: the non-virtual \`run()\` fixes the order of steps, and the virtual \`step()\` is the customisation point. Subclasses change *what* a step does but never *when* it runs.`,
  },
  {
    id: 'patterns-2-q10', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'What is the intent of the State pattern?',
    options: [
      { text: 'Let an object alter its behaviour when its internal state changes, by delegating to a state object.', correct: true, why: 'Correct: each state class implements the behaviour for one mode, replacing big conditionals.' },
      { text: 'Store the history of an object so it can be restored.', correct: false, why: 'That is Memento; State changes behaviour, it does not snapshot data.' },
      { text: 'Share one object across the whole program.', correct: false, why: 'That describes Singleton, which restricts instances rather than changing behaviour.' },
      { text: 'Choose an algorithm once at construction and never change it.', correct: false, why: 'States typically change over the object\'s life, often triggered by the states themselves.' },
    ],
    explanation: `With **State**, the context holds a current state object and forwards calls to it. Each state implements the behaviour (and the legal transitions) for one mode, so the repeated \`switch (state)\` in every method disappears.`,
  },
  {
    id: 'patterns-2-q11', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'The states pick their own successor. What does this program print?',
    codeLang: 'python',
    code: `class Green:
    def next(self): return Yellow()
class Yellow:
    def next(self): return Red()
class Red:
    def next(self): return Green()

light = Green()
names = []
for _ in range(4):
    names.append(type(light).__name__)
    light = light.next()
print(names)`,
    options: [
      { text: "['Green', 'Yellow', 'Red', 'Green']", correct: true, why: 'Correct: the cycle is Green, Yellow, Red, then back to Green on the fourth step.' },
      { text: "['Yellow', 'Red', 'Green', 'Yellow']", correct: false, why: 'The name is recorded before calling next(), so the first entry is the starting state.' },
      { text: "['Green', 'Green', 'Green', 'Green']", correct: false, why: 'light is reassigned to the new state each iteration, so the type changes.' },
      { text: "['Green', 'Yellow', 'Red']", correct: false, why: 'The loop runs four times, so a fourth entry is appended.' },
    ],
    explanation: `Each state object knows only its successor. The context keeps one reference (\`light\`) and replaces it with \`next()\`. Adding a new state means adding a class and changing one transition, not editing a central switch.`,
  },
  {
    id: 'patterns-2-q12', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What does a custom type need so that `for (auto x : obj)` compiles in C++?',
    options: [
      { text: 'begin() and end() returning iterators that support *, prefix ++ and !=.', correct: true, why: 'Correct: range-for is defined in terms of begin(), end() and these three operations.' },
      { text: 'A virtual function named next().', correct: false, why: 'C++ has no next() protocol; that is the Python/Java style.' },
      { text: 'To inherit from std::iterator.', correct: false, why: 'Inheriting from std::iterator is neither required nor sufficient (it is deprecated).' },
      { text: 'An overloaded operator[] so it can be indexed.', correct: false, why: 'Indexing is unrelated; range-for uses iterators, not subscripting.' },
    ],
    explanation: `The compiler rewrites range-for into a loop using \`begin()\` and \`end()\`: it compares with \`!=\`, advances with prefix \`++\` and reads with unary \`*\`. Any type providing these (as members or free functions found by ADL) can be used in a range-for.`,
  },
  {
    id: 'patterns-2-q13', lang: 'python', type: 'output', difficulty: 3,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `def gen():
    print("start")
    yield 1
    print("middle")
    yield 2
    print("end")

g = gen()
print("created")
print(next(g))
print(next(g))`,
    options: [
      { text: 'created\nstart\n1\nmiddle\n2', correct: true, why: 'Correct: calling gen() runs nothing; code advances to each yield only when next() is called.' },
      { text: 'start\ncreated\n1\nmiddle\n2', correct: false, why: 'The body does not start when the generator is created, so "start" cannot precede "created".' },
      { text: 'start\nmiddle\nend\ncreated\n1\n2', correct: false, why: 'Generators are lazy; they do not run to completion up front.' },
      { text: 'created\nstart\n1\nmiddle\n2\nend', correct: false, why: 'Only two next() calls were made, so execution stops at the second yield and "end" never prints.' },
    ],
    explanation: `A generator function returns a generator object **without running its body**. Each \`next()\` resumes execution until the following \`yield\`. Because only two values were requested, the code after the second \`yield\` never runs. This laziness is what makes generators ideal for the Iterator pattern.`,
  },
  {
    id: 'patterns-2-q14', lang: 'both', type: 'compare', difficulty: 3,
    prompt: 'Compare the iteration protocols of C++ and Python.',
    options: [
      { text: 'C++ uses begin()/end() iterators with *, ++ and !=; Python uses __iter__ returning an iterator whose __next__ raises StopIteration at the end.', correct: true, why: 'Correct: an iterator is a pair of positions in C++ but a single stateful object in Python.' },
      { text: 'Both use hasNext() and next().', correct: false, why: 'That is the Java protocol; neither C++ nor Python defines hasNext().' },
      { text: 'Python iterates only over lists.', correct: false, why: 'Anything with __iter__ (or __getitem__) works: sets, dicts, files, generators and your own classes.' },
      { text: 'C++ iterators signal the end by throwing.', correct: false, why: 'C++ compares the iterator with end(); exceptions are not used for normal termination.' },
    ],
    explanation: `C++ models iteration as a **range** [begin, end) and uses comparison to detect the end. Python's iterator is one object that produces values and signals exhaustion with \`StopIteration\`. A Python iterable is re-iterable if \`__iter__\` returns a fresh iterator each time (for example by being a generator function).`,
  },
  {
    id: 'patterns-2-q15', lang: 'both', type: 'concept', difficulty: 3,
    prompt: 'Which of these does turning requests into Command objects make easy?',
    options: [
      { text: 'Queuing, logging/replaying and undo/redo of operations.', correct: true, why: 'Correct: once an action is an object you can store it, serialize it and call undo on it.' },
      { text: 'Making the program faster by skipping virtual calls.', correct: false, why: 'Commands add an object and a virtual call per action; speed is not their purpose.' },
      { text: 'Ensuring a class has exactly one instance.', correct: false, why: 'That is Singleton, unrelated to commands.' },
      { text: 'Converting between incompatible interfaces.', correct: false, why: 'That describes Adapter, which bridges interfaces and has nothing to do with undo.' },
    ],
    explanation: `A command is data plus behaviour: it can sit in a job queue, be appended to an audit log, be replayed after a crash, or be undone with the information it stored when it executed. A direct method call leaves no such trace.`,
  },
];
