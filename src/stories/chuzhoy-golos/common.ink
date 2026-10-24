// исход пилота делит сезон на три мира: запись у полиции, только у игрока, у Оуэна
=== function sync_world() ===
{
- act1 == "owen" || act1 == "ellie_alone_owen":
    ~ world = "owen"
- act1 == "ellie_hides":
    ~ world = "hidden"
- else:
    ~ world = "open"
}

