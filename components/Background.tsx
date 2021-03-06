import { css, Global } from '@emotion/react'
import styled from '@emotion/styled'
import { Eye } from '@styled-icons/fa-solid'
import { FC, ImgHTMLAttributes, useReducer, useState } from 'react'

const Image = styled.img<{ blur: boolean; maximize: boolean; size?: number }>`
   position: absolute;
   height: ${p => (p.size ?? 1) * 500}px;
   object-fit: cover;
   z-index: -999;
   top: 0;
   left: 0;
   transition: filter 0.1s linear, height 2s linear;

   ${p =>
      p.maximize ||
      (p.blur &&
         css`
            filter: blur(10px) brightness(0.7);
         `)}

   @keyframes bounce {
      50% {
         top: 10%;
         width: 80%;
         left: 10%;
      }
      to {
         top: 0;
         height: 100vh;
         width: 100%;
         left: 0;
      }
   }

   ${p =>
      p.maximize &&
      css`
         position: fixed;
         z-index: 999;

         animation: bounce 0.3s linear forwards;
         cursor: zoom-out;
      `}
`

const Show = styled.button`
   position: absolute;
   right: 1rem;
   top: 0.5rem;
`

const Background: FC<
   ImgHTMLAttributes<HTMLImageElement> & {
      size?: number
   }
> = props => {
   const [blur, setBlur] = useState(true)
   const [maximized, setMaximized] = useState(false)
   const [failed, setFailed] = useReducer(() => true, false)

   if (!props.src || failed) return null

   return (
      <>
         <Show title='Maximize background' onMouseOver={() => setBlur(false)} onMouseLeave={() => setBlur(true)} onClick={() => setMaximized(true)}>
            <Eye size={20} />
         </Show>
         <Image onError={setFailed} maximize={maximized} blur={blur} {...props} onClick={() => setMaximized(false)} title={maximized ? 'Click close' : undefined} />

         {maximized && (
            <Global
               styles={css`
                  body {
                     overflow: hidden;
                  }
               `}
            />
         )}
      </>
   )
}

export default Background
