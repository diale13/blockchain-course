# Tecnologías Blockchain y Contratos Inteligentes

Obligatorio 1er Semestre 2022 - Proyecto Plataforma de Staking

## Descripción del proyecto

El proyecto es una Plataforma de Staking, la cual contiene un token siguiendo el estándar ERC-20, un contrato que permite la compra y venta de
dicho token entre los dueños de la plataforma y los usuarios, y un contrato Farm, encargado de brindar las funcionalidades vinculadas con el Sraking de dicho token.

## Integrantes del equipo
|      Nombre     | Nro. de Estudiante |             Address Registrada             |
|:---------------:|:------------------:|:------------------------------------------:|
|  Diego Franggi  |       210434       | 0xA947783b803D20032c12f58cdE0Dd20b73fE57dF |
| Mathías Gertner |       193783       | 0x335bBEA03eb4773D71F56eA425cFD7AD79B89B86 |
|   Bruno Pintos  |       214108       | 0x21176324dc254a413f195A1732055ee43AD9A7Bf |

## Componentes del proyecto

### Contratos inteligentes ([/contracts](/contracts))

En esta carpeta están todos los contratos inteligentes de la solución.

![documentation](/documentation/Diagram.png)


#### TokenContract ([TokenContract.sol](/contracts/TokenContract.sol))
Este contrato representa el token ERC-20. Además de las funcionalidades brindadas por el estándar, tiene la capacidad de <em>mintear</em> y <em>burnear</em> tokens, siguiendo la lógica de negocio definida en la letra del obligatorio.

![documentation](/documentation/TokenContract.png)

#### Vault ([Vault.sol](/contracts/Vault.sol))
Este contrato es el encargado de la administración del token ERC-20. Algunas de sus funcionalidades son indicarle a `TokenContract` que <em>mintee</em> y <em>burnee</em> tokens. Manejar la compra y venta del token con otros usuarios, definir los precios, y permitir a los administradores obtener las ganancias de la plataforma. A su vez, para la mayoría de las operaciones maneja un sistema de multifirma.

![documentation](/documentation/Vault.PNG)


#### Farm ([Farm.sol](/contracts/Farm.sol))
Este contrato es el encargado de manejar el <em>staking</em> de la plataforma. Permite que los usuarios que presentan tokens puedan <em>stakear</em> y a través de un APR obtener una ganancia <em>"yield"</em>, la cual luego pueden retirar.

![documentation](/documentation/Farm.PNG)


### Pruebas Unitarias ([/test](/test))

En esta carpeta están las pruebas unitarias para los contratos inteligentes definidos anteriormente.

### Scripts ([/scripts](/scripts))

En esta carpeta esta el script utilizado para hacer el deploy de los 3 contratos.

## Pasos para hacer el Setup del repositorio

Requisitos: Tener instalado Node.js, se puede descargar en este [link](https://nodejs.org/en/download/) (recomendamos la versión LTS)

Crear el archivo <em>.env</em> acorde a la muestra brindada ([.env.sample](.env.sample)). Cambiar las variables por las apropiadas.
Abrir una terminal y correr el siguiente comando en el root del proyecto:
```
npm install
npx hardhat compile
```

## Pasos para hacer el Deploy en Rinkeby

Requisitos: [Setup del repositorio](#pasos-para-hacer-el-setup-del-repositorio)

1. Crear un nuevo proyecto en [Infura](https://infura.io/)
2. Completar el <em>.env</em> con:
    1. La url de Infura para la testnet Rinkeby.
    2. La address de Rinkeby del signer que va a hacer el deploy.
    3. La private key de la address mencionada.
3. Correr el siguiente comando desde el root del proyecto:
```
npm run deploy-rinkeby
```

## Pasos para hacer la ejecución de test del proyecto

Requisitos: [Setup del repositorio](#pasos-para-hacer-el-setup-del-repositorio)

Abrir una terminal y correr el siguiente comando en el root del proyecto:
```
npm test
```

## Address de contratos deployados en testnet

|    Contrato   |             Address de Rinkeby             |
|:-------------:|:------------------------------------------:|
| TokenContract | 0xb8bFB7820143f91710AF3d71221943570e74E066 |
|     Vault     | 0x377770f32a258bDe54AD47F1eF9D9a1f0A18c450 |
|      Farm     | 0x471b5986fd89C16Fe50C2b74E19cCE5674A16826 |

Todos los contratos fueron deployados con el siguiente signer:

Signer address: `0xA947783b803D20032c12f58cdE0Dd20b73fE57dF`
