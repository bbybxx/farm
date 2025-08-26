import fs from 'fs'
import path from 'path'

function loadJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (e) {
    console.error('Failed to load', p, e.message)
    return {}
  }
}

const root = path.resolve('./')
const recipesPath = path.join(root, 'src', 'data', 'recipes.json')
const recipesApiPath = path.join(root, 'src', 'data', 'recipes-api.json')

const r1 = loadJSON(recipesPath)
const r2 = loadJSON(recipesApiPath)

// merge both sources to be conservative
const combined = { ...r1, ...r2 }

function normalize(s){
  return String(s||'').normalize('NFKC').trim().toLowerCase()
}

function findRecipesUsing(target){
  const t = normalize(target)
  const found = []
  for (const [name, recipe] of Object.entries(combined)){
    const ing = recipe['из'] || recipe['ingredients'] || {}
    // top-level keys
    for (const k of Object.keys(ing || {})){
      if (normalize(k) === t) { found.push(name); break }
      const v = ing[k]
      if (v && typeof v === 'object'){
        for (const nk of Object.keys(v)){
          if (normalize(nk) === t) { found.push(name); break }
        }
      }
    }
  }
  return Array.from(new Set(found)).sort()
}

const samples = ['Acorn','Amber','Amethyst','Antler','Apple','Aquamarine','Arrowhead']
for (const s of samples){
  const res = findRecipesUsing(s)
  console.log(`${s}: ${res.length} recipes`)
  if (res.length>0) console.log('  ->', res.join(', '))
}
