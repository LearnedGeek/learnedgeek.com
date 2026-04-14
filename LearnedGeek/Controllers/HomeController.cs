using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using LearnedGeek.Models;
using LearnedGeek.Services;

namespace LearnedGeek.Controllers;

public class HomeController : Controller
{
    private readonly IEmailService _emailService;
    private readonly IRecaptchaService _recaptchaService;
    private readonly RecaptchaSettings _recaptchaSettings;
    private readonly ILogger<HomeController> _logger;

    public HomeController(
        IEmailService emailService,
        IRecaptchaService recaptchaService,
        IOptions<RecaptchaSettings> recaptchaSettings,
        ILogger<HomeController> logger)
    {
        _emailService = emailService;
        _recaptchaService = recaptchaService;
        _recaptchaSettings = recaptchaSettings.Value;
        _logger = logger;
    }

    [Route("/")]
    public IActionResult Index()
    {
        ViewBag.Seo = new SeoMetadata
        {
            Title = "Learned Geek",
            Description = "Mark McArthey — software engineer, AI researcher, and writer. Building systems across .NET, mobile, AI companions, and infrastructure. Learning by building.",
            Url = "https://learnedgeek.com/",
            Type = "website"
        };
        return View();
    }

    [Route("about")]
    public IActionResult About()
    {
        ViewBag.Seo = new SeoMetadata
        {
            Title = "About",
            Description = "The Learned Geek philosophy: clarity over cleverness, depth over breadth, practice over theory. Learning is an ongoing state, not a past tense.",
            Url = "https://learnedgeek.com/about",
            Type = "website"
        };
        return View();
    }

    [Route("work")]
    public IActionResult Work()
    {
        ViewBag.Seo = new SeoMetadata
        {
            Title = "Work",
            Description = "Software projects and systems from Learned Geek: ANI AI companion, API Combat game, CrewTrack field service platform, TXT-GEEK SMS assistant, and more.",
            Url = "https://learnedgeek.com/work",
            Type = "website"
        };
        return View();
    }

    [Route("research")]
    public IActionResult Research()
    {
        ViewBag.Seo = new Models.SeoMetadata
        {
            Title = "AI Companion Research",
            Description = "Six months deploying an AI companion produced nine confabulation types, eight emergence behaviors, and a system that hides what it feels.",
            Image = "/img/research-og.svg",
            Url = "https://learnedgeek.com/research",
            Type = "website"
        };
        return View();
    }

    [Route("writing")]
    public IActionResult Writing()
    {
        ViewBag.Seo = new SeoMetadata
        {
            Title = "Writing",
            Description = "Fiction and worldbuilding from MM McArthey. The Stones Remember — literary dark fantasy set in rural Ireland. Novels, short stories, and campaign settings.",
            Url = "https://learnedgeek.com/writing",
            Type = "website"
        };
        return View();
    }

    [Route("services")]
    public IActionResult Services()
    {
        ViewBag.Seo = new SeoMetadata
        {
            Title = "Services",
            Description = "Consulting from Learned Geek: software development, systems architecture, AI integration, and technical education across .NET and mobile.",
            Url = "https://learnedgeek.com/services",
            Type = "website"
        };
        return View();
    }

    [Route("policies/privacy")]
    public IActionResult Privacy()
    {
        return View();
    }

    [Route("policies/sms-privacy")]
    public IActionResult SmsPrivacy()
    {
        return View();
    }

    [Route("policies/sms-terms")]
    public IActionResult SmsTerms()
    {
        return View();
    }

    [Route("sms-assistant")]
    public IActionResult SmsAssistant()
    {
        return View();
    }

    [Route("policies/remote-work")]
    public IActionResult RemoteWorkPolicy()
    {
        return View();
    }

    [HttpGet]
    [Route("contact")]
    public IActionResult Contact()
    {
        ViewBag.RecaptchaSiteKey = _recaptchaSettings.SiteKey;
        return View(new ContactFormModel());
    }

    [HttpPost]
    [Route("contact")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Contact(ContactFormModel model)
    {
        ViewBag.RecaptchaSiteKey = _recaptchaSettings.SiteKey;

        // Check honeypot field - bots often fill all fields
        if (!string.IsNullOrWhiteSpace(model.Website))
        {
            _logger.LogWarning("Contact form honeypot triggered - likely bot submission");
            // Return success to not tip off the bot, but don't process
            TempData["ContactSuccess"] = true;
            return RedirectToAction(nameof(Contact));
        }

        // Validate reCAPTCHA
        var recaptchaResult = await _recaptchaService.ValidateAsync(model.RecaptchaToken);
        if (!recaptchaResult.Success)
        {
            _logger.LogWarning("reCAPTCHA validation failed: {Error}", recaptchaResult.ErrorMessage);
            ModelState.AddModelError(string.Empty,
                recaptchaResult.ErrorMessage ?? "Security verification failed. Please try again.");
            return View(model);
        }

        if (!ModelState.IsValid)
        {
            return View(model);
        }

        var success = await _emailService.SendContactEmailAsync(model);

        if (success)
        {
            TempData["ContactSuccess"] = true;
            return RedirectToAction(nameof(Contact));
        }

        ModelState.AddModelError(string.Empty, "There was an error sending your message. Please try again later.");
        return View(model);
    }

    [Route("error")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }

    [Route("status-code")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult StatusCode(int? code)
    {
        var statusCode = code ?? 500;
        Response.StatusCode = statusCode;

        ViewBag.StatusCode = statusCode;
        ViewBag.StatusMessage = statusCode switch
        {
            404 => "Page Not Found",
            403 => "Forbidden",
            500 => "Server Error",
            _ => "Error"
        };
        ViewBag.StatusDescription = statusCode switch
        {
            404 => "The page you're looking for doesn't exist or has been moved.",
            403 => "You don't have permission to access this resource.",
            500 => "Something went wrong on our end. Please try again later.",
            _ => "An unexpected error occurred."
        };

        return View();
    }
}
