# Spike 006 — fixtures

Dez presets `.milk` originais, copiados sem alteração de [jberg/butterchurn-presets](https://github.com/jberg/butterchurn-presets) (`presets/milkdrop/`, MIT). Servem para testar a conversão `.milk` → preset do Butterchurn 3 (equações EEL em WASM + shaders HLSL → GLSL) e comparar com a conversão oficial do mesmo pacote (`butterchurn-presets@3.0.0-beta.4`).

Os nomes dos arquivos são os títulos dos presets e trazem os créditos dos autores da comunidade MilkDrop (Royal, EoS, Geiss, Rovastar, Fvese, Mig, Flexi, Martin, Suksma, Fumbling_Foo, En D). Não renomear.

Dois deles (`Fumbling_Foo + En D & Martin - Mandelverse` e `martin - castle in the air`) usam `round`/`fwidth` nos shaders, funções que o conversor HLSL não reconhece: são os casos de falha esperada.

A bateria do spike (flags `engine3`/`spike006`) saiu com a migração (spec 021). Estes arquivos continuam como casos de teste da importação (spec 022) e da futura suíte de testes. Resultado no Windows: 8/10 tocam (as falhas são `Fumbling_Foo + En D & Martin - Mandelverse` e `martin - castle in the air`).
