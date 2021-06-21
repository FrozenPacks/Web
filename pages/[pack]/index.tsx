import styled from '@emotion/styled'
import { Clock, Download } from '@styled-icons/fa-solid'
import { GetServerSideProps } from 'next'
import { FC, useMemo, useState } from 'react'
import Background from '../../components/Background'
import Layout from '../../components/Layout'
import Line from '../../components/Line'
import Link from '../../components/Link'
import Modlist from '../../components/Modlist'
import Pages, { LinkPage } from '../../components/Pages'
import Title from '../../components/Title'
import database, { serialize } from '../../database'
import { IMod } from '../../database/models/Mod'
import Pack, { IPack } from '../../database/models/Pack'
import Release, { IRelease } from '../../database/models/Release'

const PackView: FC<{
   mods: IMod[]
   name: string
   slug: string
   description?: string
   assets: IPack['assets']
   links: IPack['links']
   pages: LinkPage[]
   version?: string
}> = ({ name, assets, links, description, version, slug, ...props }) => {
   const [hoveredMod, setHoveredMod] = useState<IMod>()
   const [hoveredPage, setHoveredPage] = useState<string>()

   const pages = useMemo(
      () =>
         props.pages.map(page => ({
            ...page,
            highlight: hoveredMod?.pages?.some(p => p.slug === page.slug),
         })),
      [props.pages, hoveredMod]
   )

   const mods = useMemo(
      () =>
         props.mods.map(mod => ({
            ...mod,
            highlight: mod.pages?.some(p => p.slug === hoveredPage),
         })),
      [props.mods, hoveredPage]
   )

   const [download] = Object.entries(links ?? {})

   return (
      <Layout title={name} image={assets?.icon} description={description}>
         <Background src={assets?.background} />

         <Title noline>
            {name} {version && <Version>({version})</Version>}

            <Subtitle>
               {download &&
                  <Link href={`/${slug}/install/${download[0]}`}>
                     <Links> Download <Download size={20} /></Links>
                  </Link>
               }

               <Link href={`/${slug}/changelog`}>
                  <Links> Changelog <Clock size={20} /></Links>
               </Link>
            </Subtitle>
         </Title>

         {description?.split('\n').map((line, i) => (
            <Description key={i}>{line}</Description>
         ))}

         {pages.length > 0 && <Pages pages={pages} onHover={setHoveredPage} />}

         <Line invisible />

         <Modlist mods={mods} onHover={setHoveredMod} />
      </Layout>
   )
}

const Version = styled.span`
   font-size: 1.2rem;
   position: absolute;
`

const Subtitle = styled.h2`
   margin-top: 0.5rem;
   font-size: 1.2rem;
   text-align: center;
   display: grid;
   grid-auto-flow: column;
   justify-content: space-around;
`

const Links = styled.span`
   cursor: pointer;

   &:hover {
      text-decoration: underline;
   }

   svg {
      margin-left: 0.3rem;
   }
`

const Description = styled.p`
   text-align: center;
   max-width: 1200px;
   margin: 0 auto;
`

export const getServerSideProps: GetServerSideProps = async ({ params, query }) => {
   await database()

   const [pack] = await Pack.aggregate<IPack>([
      { $match: { slug: params?.pack } },
      {
         $lookup: {
            from: 'pages',
            localField: '_id',
            foreignField: 'pack',
            as: 'pages',
         },
      }
   ])

   if (!pack) return { notFound: true }

   const [release] = await Release.aggregate<IRelease>([
      { $match: { pack: pack._id } },
      { $match: { version: query?.version ?? { $exists: true } } },
      { $sort: { date: -1 } },
      { $unwind: '$mods' },
      {
         $lookup: {
            from: 'pages',
            let: {
               slug: '$mods.slug',
            },
            pipeline: [
               {
                  $match: {
                     pack: pack._id,
                     $expr: {
                        $in: ['$$slug', '$mods.slug'],
                     },
                  },
               }
            ],
            as: 'mods.pages',
         },
      },
      {
         $group: {
            _id: '$_id',
            version: { $first: '$version' },
            date: { $first: '$date' },
            mods: { $push: '$mods' },
         },
      },
      { $sort: { date: -1 } },
   ])

   if (!release && query.version) return { notFound: true }

   const version = release?.version ?? null
   const mods = release?.mods ?? []

   const pages =
      pack.pages?.map(({ slug, title }) => ({
         title,
         slug,
         link: `/${pack.slug}/${slug}`,
      })) ?? []

   return { props: { ...serialize(pack), mods: serialize(mods), pages, version } }
}

export default PackView
