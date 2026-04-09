*"Objects don't dispose themselves when they go out of scope. I believed they did. For three decades."*

## The Misconception

Quick quiz: What happens when this method exits?

```csharp
public void ProcessData()
{
    var stream = new FileStream("data.txt", FileMode.Open);
    var reader = new StreamReader(stream);

    var content = reader.ReadToEnd();
    Console.WriteLine(content);

    // Method exits here - are stream and reader disposed?
}
```

If you answered "yes, they're disposed automatically when they go out of scope," you're in good company.

**You're also wrong.**

I believed this for 30 years. It's one of the most common misconceptions in C#, and it's why our production API leaked memory for two years.

## What Actually Happens

When `ProcessData()` exits:

1. ✅ The **local variables** `stream` and `reader` go out of scope (stack cleanup)
2. ✅ The **references** to the objects are removed
3. ❌ The **objects themselves** are NOT disposed
4. ❌ The **file handles** remain open
5. ⏰ Eventually, the garbage collector will collect them
6. ⏰ Eventually, the finalizers might run and close the handles
7. 🔥 Or you might run out of file handles first

**The objects leak until the garbage collector decides to collect them.**

Under light load, the GC might run quickly enough that you never notice. Under heavy load (100+ objects/second), they pile up faster than GC can collect them.

## Three Types of Cleanup

C# has three distinct cleanup mechanisms:

### 1. Stack Cleanup (Automatic, Immediate)

```csharp
void Method()
{
    int number = 42;
    string text = "hello";

    // When method exits:
    // ✅ 'number' stack space reclaimed immediately
    // ✅ 'text' reference removed immediately
}
```

**Stack variables** are cleaned up **automatically and immediately**.

This creates the illusion that everything gets cleaned up automatically.

### 2. Heap Cleanup (Automatic, Eventually)

```csharp
void Method()
{
    var myObject = new MyClass();

    // When method exits:
    // ✅ Reference 'myObject' removed from stack
    // ❌ MyClass instance still exists on heap
    // ⏰ GC will collect it... eventually
}
```

**Heap objects** are cleaned up by the garbage collector at some **non-deterministic time in the future**.

For pure managed memory, this is fine. But for unmanaged resources (file handles, network connections, database connections), "eventually" isn't good enough.

### 3. Resource Cleanup (Manual, Explicit)

```csharp
void Method()
{
    var stream = new FileStream("data.txt", FileMode.Open);

    // File handle is OPEN

    // When method exits:
    // ✅ Reference 'stream' removed
    // ❌ File handle still OPEN
    // ❌ FileStream object NOT disposed
    // ⏰ Eventually GC collects it
    // ⏰ Eventually finalizer runs and closes handle
    // 🔥 Or system runs out of handles
}
```

**Unmanaged resources** must be **explicitly released** by calling `Dispose()`.

## The Pattern: Using Statements

The correct way to handle IDisposable objects:

```csharp
void Method()
{
    using (var stream = new FileStream("data.txt", FileMode.Open))
    using (var reader = new StreamReader(stream))
    {
        var content = reader.ReadToEnd();
        Console.WriteLine(content);

    } // ✅ Dispose() called here, GUARANTEED
      // ✅ File handle closed immediately
      // ✅ Even if exception thrown
}
```

Or with the newer syntax:

```csharp
void Method()
{
    using var stream = new FileStream("data.txt", FileMode.Open);
    using var reader = new StreamReader(stream);

    var content = reader.ReadToEnd();
    Console.WriteLine(content);

    // ✅ Dispose() called when method exits
}
```

## What `using` Actually Does

The `using` statement is compiler syntactic sugar. This:

```csharp
using (var obj = new DisposableObject())
{
    obj.DoSomething();
}
```

Becomes this:

```csharp
DisposableObject obj = new DisposableObject();
try
{
    obj.DoSomething();
}
finally
{
    if (obj != null)
    {
        ((IDisposable)obj).Dispose();
    }
}
```

**Key insight:** The `finally` block ensures `Dispose()` is called **even if an exception is thrown**.

Without `using`, you'd have to write that try/finally yourself. Every time. For every IDisposable object.

## Why C# Works This Way

Coming from C++, this seems backwards. In C++, destructors run automatically when objects go out of scope (RAII).

Why didn't C# do this?

### The Problem: Non-Deterministic Garbage Collection

C# uses a **garbage collector** for memory management. This means:

1. Objects aren't destroyed immediately when references disappear
2. The GC runs at unpredictable times
3. Object destruction order is not guaranteed
4. Destructors (finalizers) might never run

If C# automatically called `Dispose()` when objects "went out of scope," it would have to:
- Track all IDisposable objects
- Dispose them in the right order
- Handle circular references
- Deal with objects that outlive their scope (closures, lambdas)

Instead, C# made a design decision:
- **Memory management** is automatic (GC)
- **Resource management** is manual (IDisposable)

You get to choose **when** resources are released, rather than waiting for the GC.

## Real-World Examples

### Example 1: Database Connections

```csharp
// WRONG - connection leaks
public List<User> GetUsers()
{
    var connection = new SqlConnection(connectionString);
    connection.Open();

    var command = new SqlCommand("SELECT * FROM Users", connection);
    var reader = command.ExecuteReader();

    var users = new List<User>();
    while (reader.Read())
    {
        users.Add(new User { Name = reader.GetString(0) });
    }

    return users;
    // ❌ None of these are disposed!
}

// CORRECT - everything disposed
public List<User> GetUsers()
{
    using (var connection = new SqlConnection(connectionString))
    using (var command = new SqlCommand("SELECT * FROM Users", connection))
    {
        connection.Open();

        using (var reader = command.ExecuteReader())
        {
            var users = new List<User>();
            while (reader.Read())
            {
                users.Add(new User { Name = reader.GetString(0) });
            }
            return users;
        }
    }
    // ✅ All resources disposed in reverse order
}
```

### Example 2: HTTP Requests

```csharp
// WRONG - leaked millions of objects in production
protected async Task<HttpResponseMessage> GetAsync(string url)
{
    var request = await BuildHttpRequest(HttpMethod.Get, url);
    var response = await ExecuteHttpRequestAsync(request, cancellationToken);
    return response;
    // ❌ Request never disposed
    // ❌ Response returned without disposal
}

// CORRECT
protected async Task<HttpResponseMessage> GetAsync(string url)
{
    using (var request = await BuildHttpRequest(HttpMethod.Get, url))
    {
        var response = await ExecuteHttpRequestAsync(request, cancellationToken);
        return response;
        // ✅ Request disposed before returning
        // ⚠️ Response must be disposed by caller
    }
}
```

## The Gotcha: HttpClient

```csharp
// WRONG - creates new HttpClient per request
public async Task<string> GetData(string url)
{
    using (var client = new HttpClient())
    {
        return await client.GetStringAsync(url);
    }
    // ❌ Disposes HttpClient, but sockets remain open!
}
```

`HttpClient` is IDisposable, but it's designed to be **long-lived and reused**. Creating/disposing per request exhausts sockets.

```csharp
// CORRECT - reuse HttpClient
private static readonly HttpClient _client = new HttpClient();

public async Task<string> GetData(string url)
{
    return await _client.GetStringAsync(url);
}
```

## How to Verify Disposal

### Use Visual Studio's Diagnostic Tools

1. Start debugging
2. Open Diagnostic Tools (Debug → Windows → Show Diagnostic Tools)
3. Take memory snapshot
4. Run your code
5. Take another snapshot
6. Compare - look for IDisposable objects that grew

In our production leak, we saw:
- `HttpResponseMessage`: 2,257 instances (should be < 10)
- `HttpRequestMessage`: 2,289 instances (should be < 10)

Dead giveaway of missing `using` statements.

### Enable Code Analysis

Add to your `.editorconfig`:

```
[*.cs]
dotnet_diagnostic.CA2000.severity = warning
```

This warns about objects that aren't disposed before going out of scope.

## Common Questions

### Q: Why didn't my app crash without `using`?

**A:** Eventually, the GC collects the objects and finalizers run. Your app might work fine at low load. Under high load, resources exhaust before GC catches up.

### Q: Can I just call `Dispose()` manually?

**A:** Yes, but you miss exception safety:

```csharp
// Risky:
var stream = new FileStream("file.txt", FileMode.Open);
stream.Write(data);
stream.Dispose(); // ❌ If Write throws, Dispose never called!

// Safe:
using (var stream = new FileStream("file.txt", FileMode.Open))
{
    stream.Write(data);
} // ✅ Dispose called even if Write throws
```

### Q: Do all objects need disposal?

**A:** No. Only objects that:
- Implement `IDisposable`
- Hold unmanaged resources (file handles, sockets, database connections)

Most plain C# objects (POCOs, DTOs) don't need disposal.

## The Mental Model

Think of IDisposable objects in three categories:

### 1. Short-Lived, Always Dispose
- File streams
- Database connections
- HTTP requests/responses
- Memory streams

**Pattern:** Always wrap in `using`

### 2. Long-Lived, Dispose Once
- HttpClient
- Database connection pools
- Singleton services

**Pattern:** Create once, dispose in application shutdown

### 3. Framework-Managed
- Objects created by ASP.NET, WPF
- Objects injected by DI container

**Pattern:** Let framework handle disposal

## Key Takeaways

1. **Scope ≠ Disposal** - Objects don't auto-dispose when leaving scope
2. **Stack vs Heap** - Local references disappear, but objects live on
3. **GC ≠ Dispose** - GC reclaims memory eventually, Dispose releases resources immediately
4. **Always use `using`** - For IDisposable objects you create
5. **Exception safety** - `using` ensures disposal even during exceptions

## The Revelation

When I finally understood this — after 30 years — everything clicked:

- Why our memory leak happened
- Why `using` statements exist
- Why the GC isn't enough
- Why C# didn't copy C++ destructors

One concept. Massive implications.

---

In **[Part 3](/Blog/Post/memory-leak-part-3-web-api-disposal)**, I'll show the specific Web API disposal pattern that leaked in every controller we had — and the simple fix that changed our return types.

In **[Part 4](/Blog/Post/memory-leak-part-4-entity-framework-factory-disposal)**, I'll find the leak that survived the HTTP fix — Entity Framework `DbContext` objects created by a factory and "disposed" via `ContinueWith`.

---

**Resources:**
- [IDisposable Pattern (Microsoft Docs)](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose)
- [CA2000: Dispose objects before losing scope](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2000)

**Tags:** csharp, dotnet, idisposable, memory-management, fundamentals, best-practices
