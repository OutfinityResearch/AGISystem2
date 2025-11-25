# AGISystem2 – Issues and Design Risks

This document collects cross-cutting issues and design risks that were previously embedded in URS, FS, and NFS. It is not a requirements document; it is a living list of concerns to keep in view while evolving the specifications and implementation.

## Geometry and Dimensioning

- **Multiple supported dimension configurations**  
  Vector dimensions are restricted to {512, 1024, 2048, 4096}, but different profiles trade off speed vs. fidelity. We need benchmarking and guidance to help choose appropriate defaults per environment and to understand how dimension count affects reasoning quality and performance.

- **Expressivity vs. simplicity of property axes**  
  Only a small set of physical properties (e.g., `boiling_point`) currently map explicitly into ontology axes such as Temperature. Extending this to other properties and non-numeric attributes requires careful design of new axes, encoders and tests to avoid overfitting or leaking domain-specific assumptions into the core geometry.

## Retrieval and Indexing

- **LSH/nearest-neighbour tuning**  
  The chosen retrieval strategy (LSH/simhash/grid) and its parameters may need tuning to balance recall, precision and CPU budget. Different domains and profile sizes may require different configurations; evaluation data and guidelines are still needed.

## Translation and Determinism

- **Translation dependency and determinism**  
  Reliance on an external translation/LLM bridge to normalise natural language can introduce nondeterminism. We need a clear pinning and caching strategy (model/version, prompts, decoding parameters) to ensure repeatability, and to define how the system behaves when translation fails or drifts over time.

- **Language coverage and trust**  
  English is the primary semantics; support for other languages depends on translation quality. Poor translation can affect correctness and trust, so deployments in multilingual contexts may require additional validation and monitoring.

## Usability and Mental Models

- **User understanding of theories and dimensions**  
  The concepts of “theory stacks”, “layers”, and “dimensions” may be unfamiliar to many users. Without onboarding aids and good tooling, users may mis-teach the system or misinterpret explanations. Documentation, visualisation tools, and guided workflows are needed to align mental models.

- **Conflict resolution policies**  
  When multiple theories conflict, the policies for precedence, comparison, and refusal to answer must be exposed clearly. Hidden or opaque conflict handling can lead to user surprise, even when the underlying reasoning is deterministic.

## Storage and Evolution

- **Storage formats and versioning**  
  The storage format for concepts, theories, masks and profiles must be versioned and documented. Without a clear migration story, instances may drift over time or become incompatible, especially when new dimensions, relations or encoder behaviours are introduced.

## Testing and Profiles

- **Profile coverage and guarantees**  
  Different profiles (auto_test, manual_test, prod) place different constraints on dimensions, limits and persistence. We need an explicit mapping from profiles to guarantees (latency, capacity, determinism) and to required test suites, so that changing a profile configuration does not unknowingly weaken assurances.***
