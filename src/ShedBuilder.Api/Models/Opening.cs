namespace ShedBuilder.Api.Models;

public enum OpeningType
{
    Door,
    Window
}

public enum WallSide
{
    Front,
    Back,
    Left,
    Right
}

public class Opening
{
    public OpeningType Type { get; set; }
    public WallSide Wall { get; set; }
    public int OffsetInches { get; set; }
    public int WidthInches { get; set; }
    public int HeightInches { get; set; }
    public int SillHeightInches { get; set; }
}
