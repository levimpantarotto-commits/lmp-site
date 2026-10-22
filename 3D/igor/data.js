export const ambientes=[
 ['Chegada','Jardim e fachada',[3,4,5]],['Sala','Ambiente social',[11,10]],['Cozinha','Cozinha e sala',[6,7,8]],['Mezanino','Piso superior fotografado',[0,1,2]],['Quarto I','Ambiente fotografado',[14]],['Quarto II','Ambiente fotografado',[15]],['Banheiro I','Ambiente fotografado',[12,13]],['Banheiro II','Ambiente fotografado',[16,17]],['Quarto III','Teto inclinado fotografado',[18]],['Área externa','Terraço, deck e vista',[9,19,20,21,22]],['Ambiente adicional','Ligação com a casa não confirmada',[23,24,25,26]],['Fachada','Retorno visual',[27,28]]
].map(([nome,nota,fotos],id)=>({id,nome,nota,fotos}));
export const asset=n=>`./assets/${String(n).padStart(2,'0')}.jpg`;
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const nextState=(state,delta)=>{const ambiente=clamp(state.ambiente+delta,0,ambientes.length-1);if(ambiente===state.ambiente)return state;return {ambiente,foto:delta<0?ambientes[ambiente].fotos.length-1:0};};
export const stepPhoto=(state,delta)=>{const here=ambientes[state.ambiente];if(delta>0&&state.foto<here.fotos.length-1)return {...state,foto:state.foto+1};if(delta<0&&state.foto>0)return {...state,foto:state.foto-1};return nextState(state,delta);};
export const allPhotos=()=>ambientes.flatMap(a=>a.fotos);
