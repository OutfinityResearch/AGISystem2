# AGISystem2 - System Specifications

# Chapter 7g: L3 Bootstrap Verbs

**Document Version:** 1.0
**Author:** Sînică Alboaie
**Status:** Draft Specification
**Part Of:** DS07 CommonLexicon Pack (refactored; formerly Core)
**Pack File (canonical):** `config/Packs/Lexicon/11-bootstrap-verbs.sys2`

---

## 7g.1 Overview

This document specifies the **Level 3 (L3) Bootstrap Verbs** - common verbs built from L2 semantic primitives. These verbs:

1. **Compose L2 primitives** into natural language concepts
2. **Provide direct DSL mappings** for common verbs
3. **Enable NL→DSL translation** for LLMs

---

## 7g.2 Verb Categories

| Category | Verbs | L2 Primitive Used |
|----------|-------|-------------------|
| Communication | tell, ask, say | _mtrans, _speak |
| Transfer | give, take | _atrans |
| Transaction | buy, sell | _atrans |
| Motion | go, move | _ptrans |
| Perception | see, hear | _attend |
| Mental State | want, like, fear, think | _conc + states |
| Consumption | eat, drink | _ingest |

---

## 7g.3 Communication Verbs

### 7g.3.1 tell

Speaker communicates information to listener.

```sys2
# Types: speaker:Person, info:Abstract, listener:Person
@TellGraph:tell graph speaker info listener
    @result _mtrans $speaker $info $speaker $listener
    return $result
end
```

**Example:** `tell John News Mary` → John tells the news to Mary

### 7g.3.2 ask

Asker requests information from askee.

```sys2
# Types: asker:Person, question:Abstract, askee:Person
@AskGraph:ask graph asker question askee
    @req __Role Request $question
    @result _mtrans $asker $req $asker $askee
    return $result
end
```

**Example:** `ask John Question Teacher` → John asks the teacher a question

### 7g.3.3 say

Speaker produces utterance.

```sys2
# Types: speaker:Person, utterance:Abstract
@SayGraph:say graph speaker utterance
    @result _speak $speaker $utterance
    return $result
end
```

**Example:** `say John Hello` → John says hello

---

## 7g.4 Transfer Verbs

### 7g.4.1 give

Giver transfers object to receiver.

```sys2
# Types: giver:Person, object:Entity, receiver:Person
@GiveGraph:give graph giver object receiver
    @result _atrans $giver $object $giver $receiver
    return $result
end
```

**Example:** `give John Book Mary` → John gives the book to Mary

### 7g.4.2 take

Taker acquires object from source.

```sys2
# Types: taker:Person, object:Entity, source:Person|Place
@TakeGraph:take graph taker object source
    @result _atrans $taker $object $source $taker
    return $result
end
```

**Example:** `take John Book Shelf` → John takes the book from the shelf

---

## 7g.5 Transaction Verbs

### 7g.5.1 buy

Buyer acquires item in exchange for price.

```sys2
# Types: buyer:Person, item:Entity, seller:Person, price:Quantity
@BuyGraph:buy graph buyer item seller price
    @t1 _atrans $buyer $item $seller $buyer
    @t2 _atrans $buyer $price $buyer $seller
    @result __Bundle $t1 $t2
    return $result
end
```

**Example:** `buy John Car Dealer TenThousand` → John buys the car from the dealer for $10,000

### 7g.5.2 sell

Seller transfers item in exchange for price.

```sys2
# Types: seller:Person, item:Entity, buyer:Person, price:Quantity
@SellGraph:sell graph seller item buyer price
    @result buy $buyer $item $seller $price
    return $result
end
```

**Example:** `sell Dealer Car John TenThousand` → Dealer sells the car to John for $10,000

---

## 7g.6 Motion Verbs

### 7g.6.1 go

Agent moves themselves from source to destination.

```sys2
# Types: agent:Person, from:Place, to:Place
@GoGraph:go graph agent from to
    @result _ptrans $agent $agent $from $to
    return $result
end
```

**Example:** `go John Home Work` → John goes from home to work

### 7g.6.2 move

Agent moves object from source to destination.

```sys2
# Types: agent:Person, object:Entity, from:Place, to:Place
@MoveGraph:move graph agent object from to
    @result _ptrans $agent $object $from $to
    return $result
end
```

**Example:** `move John Box Room Garage` → John moves the box from the room to the garage

---

## 7g.7 Perception Verbs

### 7g.7.1 see

Experiencer perceives object visually.

```sys2
# Types: experiencer:Person, object:Entity
@SeeGraph:see graph experiencer object
    @eyes __Object
    @result _attend $experiencer $eyes $object
    return $result
end
```

**Example:** `see John Bird` → John sees the bird

### 7g.7.2 hear

Experiencer perceives sound auditorily.

```sys2
# Types: experiencer:Person, sound:Entity|Abstract
@HearGraph:hear graph experiencer sound
    @ears __Object
    @result _attend $experiencer $ears $sound
    return $result
end
```

**Example:** `hear Mary Music` → Mary hears the music

---

## 7g.8 Mental State Verbs

### 7g.8.1 want

Experiencer desires something.

```sys2
# State atom
@Wanting:Wanting __State

# Types: experiencer:Person, desired:Entity|Abstract|Event
@WantGraph:want graph experiencer desired
    @eid __Event
    @r1 __Role Experiencer $experiencer
    @r2 __Role Theme $desired
    @r3 __Role State Wanting
    @result __Bundle $eid $r1 $r2 $r3
    return $result
end
```

**Example:** `want John NewCar` → John wants a new car

### 7g.8.2 like

Experiencer has positive attitude toward something.

```sys2
# State atom
@Liking:Liking __State

# Types: experiencer:Person, liked:Entity|Abstract
@LikeGraph:like graph experiencer liked
    @eid __Event
    @r1 __Role Experiencer $experiencer
    @r2 __Role Theme $liked
    @r3 __Role State Liking
    @result __Bundle $eid $r1 $r2 $r3
    return $result
end
```

**Example:** `like Mary Pizza` → Mary likes pizza

### 7g.8.3 fear

Experiencer has negative attitude toward something.

```sys2
# State atom
@Fearing:Fearing __State

# Types: experiencer:Person, feared:Entity|Abstract
@FearGraph:fear graph experiencer feared
    @eid __Event
    @r1 __Role Experiencer $experiencer
    @r2 __Role Theme $feared
    @r3 __Role State Fearing
    @result __Bundle $eid $r1 $r2 $r3
    return $result
end
```

**Example:** `fear Child Spider` → The child fears spiders

### 7g.8.4 think

Thinker conceptualizes something.

```sys2
# Types: thinker:Person, concept:Abstract
@ThinkGraph:think graph thinker concept
    @result _conc $thinker $concept
    return $result
end
```

**Example:** `think Scientist Problem` → The scientist thinks about the problem

---

## 7g.9 Consumption Verbs

### 7g.9.1 eat

Eater ingests food.

```sys2
# Types: eater:Person, food:Substance|Object
@EatGraph:eat graph eater food
    @result _ingest $eater $food
    return $result
end
```

**Example:** `eat John Apple` → John eats the apple

### 7g.9.2 drink

Drinker ingests liquid.

```sys2
# Types: drinker:Person, liquid:Substance
@DrinkGraph:drink graph drinker liquid
    @result _ingest $drinker $liquid
    return $result
end
```

**Example:** `drink Mary Coffee` → Mary drinks coffee

---

## 7g.10 Verb Summary

| Category | Verb | L2 Base | Arguments |
|----------|------|---------|-----------|
| Communication | tell | _mtrans | speaker, info, listener |
| Communication | ask | _mtrans | asker, question, askee |
| Communication | say | _speak | speaker, utterance |
| Transfer | give | _atrans | giver, object, receiver |
| Transfer | take | _atrans | taker, object, source |
| Transaction | buy | _atrans | buyer, item, seller, price |
| Transaction | sell | _atrans | seller, item, buyer, price |
| Motion | go | _ptrans | agent, from, to |
| Motion | move | _ptrans | agent, object, from, to |
| Perception | see | _attend | experiencer, object |
| Perception | hear | _attend | experiencer, sound |
| Mental | want | state | experiencer, desired |
| Mental | like | state | experiencer, liked |
| Mental | fear | state | experiencer, feared |
| Mental | think | _conc | thinker, concept |
| Consumption | eat | _ingest | eater, food |
| Consumption | drink | _ingest | drinker, liquid |

**Total: 17 L3 verbs**

---

## 7g.11 L2→L3 Decomposition

This diagram shows how L3 verbs compose L2 primitives:

```
L3 Verbs          L2 Primitives
─────────────────────────────────
tell ─────────────→ _mtrans
ask ──────────────→ _mtrans + Request
say ──────────────→ _speak
give ─────────────→ _atrans
take ─────────────→ _atrans
buy ──────────────→ _atrans + _atrans
sell ─────────────→ buy (inverse)
go ───────────────→ _ptrans
move ─────────────→ _ptrans
see ──────────────→ _attend + eyes
hear ─────────────→ _attend + ears
want, like, fear ─→ Event + State roles
think ────────────→ _conc
eat, drink ───────→ _ingest
```

---

*End of DS07g - See [DS07-Index](DS07-Core-Theory-Index.md) for complete Core Theory*
