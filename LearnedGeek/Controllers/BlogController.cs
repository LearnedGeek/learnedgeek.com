using Microsoft.AspNetCore.Mvc;
using LearnedGeek.Models;
using LearnedGeek.Services;

namespace LearnedGeek.Controllers;

public class BlogController : Controller
{
    private readonly IBlogService _blogService;

    public BlogController(IBlogService blogService)
    {
        _blogService = blogService;
    }

    public async Task<IActionResult> Index(string? category, int? year, int? month, string? tag)
    {
        var allPosts = await _blogService.GetAllPostsAsync();
        IEnumerable<BlogPost> posts = allPosts;

        // Track whether this is a filtered view — filtered views canonical back to /Blog
        // so Google doesn't treat them as duplicate content
        var isFiltered = false;

        // Filter by category if specified
        if (!string.IsNullOrEmpty(category) && Enum.TryParse<Category>(category, true, out var cat))
        {
            posts = posts.Where(p => p.Category == cat);
            ViewBag.SelectedCategory = cat;
            isFiltered = true;
        }
        else
        {
            ViewBag.SelectedCategory = null;
        }

        // Filter by year/month if specified
        if (year.HasValue)
        {
            posts = posts.Where(p => p.Date.Year == year.Value);
            ViewBag.SelectedYear = year.Value;
            isFiltered = true;

            if (month.HasValue)
            {
                posts = posts.Where(p => p.Date.Month == month.Value);
                ViewBag.SelectedMonth = month.Value;
            }
        }

        // Filter by tag if specified
        if (!string.IsNullOrEmpty(tag))
        {
            posts = posts.Where(p => p.Tags.Any(t => t.Equals(tag, StringComparison.OrdinalIgnoreCase)));
            ViewBag.SelectedTag = tag;
            isFiltered = true;
        }

        // Set SEO metadata: filtered views (tag/category/archive) canonical to /Blog
        // and are noindexed to avoid duplicate content and wasted crawl budget
        ViewBag.Seo = new SeoMetadata
        {
            Title = "Blog",
            Description = "Learning by building: posts on software, AI research, mobile development, infrastructure, and the occasional story.",
            Url = isFiltered ? "https://learnedgeek.com/Blog" : "https://learnedgeek.com/Blog",
            Type = "website"
        };
        ViewBag.NoIndex = isFiltered;

        // Pass all posts for sidebar archive computation
        ViewBag.AllPosts = allPosts;

        // Get tag counts for sidebar tag cloud
        var tagCounts = await _blogService.GetTagCountsAsync();
        ViewBag.TagCounts = tagCounts;

        return View(posts);
    }

    [Route("Blog/Post/{slug}")]
    public async Task<IActionResult> Post(string slug)
    {
        var post = await _blogService.GetPostBySlugAsync(slug);

        if (post == null)
            return NotFound();

        // Set SEO metadata
        ViewBag.Seo = new SeoMetadata
        {
            Title = post.Title,
            Description = post.Description,
            Image = post.Image,
            Url = $"https://learnedgeek.com/Blog/Post/{post.Slug}",
            Type = "article",
            PublishedTime = post.Date,
            Author = "Learned Geek",
            Tags = post.Tags
        };

        // Get related posts from the same category
        var relatedPosts = (await _blogService.GetPostsByCategoryAsync(post.Category))
            .Where(p => p.Slug != post.Slug)
            .Take(3);

        ViewBag.RelatedPosts = relatedPosts;

        return View(post);
    }
}
