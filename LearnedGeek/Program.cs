using LearnedGeek.Models;
using LearnedGeek.Services;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

// Configure email settings
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddTransient<IEmailService, EmailService>();

// Configure reCAPTCHA settings
builder.Services.Configure<RecaptchaSettings>(builder.Configuration.GetSection("Recaptcha"));
builder.Services.AddHttpClient<IRecaptchaService, RecaptchaService>();

// Blog service
builder.Services.AddSingleton<IBlogService, BlogService>();

// LinkedIn integration
builder.Services.Configure<LinkedInSettings>(builder.Configuration.GetSection("LinkedIn"));
builder.Services.AddHttpClient<ILinkedInService, LinkedInService>();

// Instagram integration
builder.Services.Configure<InstagramSettings>(builder.Configuration.GetSection("Instagram"));
builder.Services.AddHttpClient<IInstagramService, InstagramService>();

// Hashtag generation (Claude API)
builder.Services.Configure<AnthropicSettings>(builder.Configuration.GetSection("Anthropic"));
builder.Services.AddHttpClient<IHashtagService, HashtagService>();

// Admin settings
builder.Services.Configure<AdminSettings>(builder.Configuration.GetSection("Admin"));

// Session for OAuth state
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/error");
    app.UseHsts();
}

app.UseStatusCodePagesWithReExecute("/status-code", "?code={0}");

app.UseHttpsRedirection();

// 301 redirects from old /Home/ routes to clean URLs
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    var redirect = path switch
    {
        "/Home/About" => "/about",
        "/Home/Work" => "/work",
        "/Home/Writing" => "/writing",
        "/Home/Services" => "/services",
        "/Home/Contact" => "/contact",
        "/Home/Privacy" => "/policies/privacy",
        "/Home/SmsPrivacy" => "/policies/sms-privacy",
        "/Home/SmsTerms" => "/policies/sms-terms",
        "/Home/SmsAssistant" => "/sms-assistant",
        "/Home/RemoteWorkPolicy" => "/policies/remote-work",
        _ => null
    };

    if (redirect != null)
    {
        var query = context.Request.QueryString.Value ?? "";
        context.Response.StatusCode = 301;
        context.Response.Headers.Location = redirect + query;
        return;
    }

    await next();
});

app.UseRouting();

app.UseSession();
app.UseAuthorization();

app.MapStaticAssets();

// Fallback for FTP'd files - restricted to specific patterns
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var path = ctx.File.Name;
        // Only allow byco.json through the fallback
        if (!path.Equals("byco.json", StringComparison.OrdinalIgnoreCase))
        {
            // If it wasn't served by MapStaticAssets and isn't byco.json, block it
            ctx.Context.Response.StatusCode = 404;
            ctx.Context.Response.ContentLength = 0;
            ctx.Context.Response.Body = Stream.Null;
        }
    }
});

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();


app.Run();
