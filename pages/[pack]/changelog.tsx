import styled from '@emotion/styled'
import { GetServerSideProps } from 'next'
import { FC } from 'react'
import Background from '../../components/Background'
import useTooltip from '../../components/hooks/useTooltip'
import Layout from '../../components/Layout'
import Release from '../../components/Release'
import Timeline, { TimelineDot } from '../../components/Timeline'
import Title from '../../components/Title'
import database, { serialize } from '../../database'
import Pack, { IPack } from '../../database/models/Pack'
import { IRelease } from '../../database/models/Release'

const PackView: FC<{
   name: string
   slug: string
   assets: IPack['assets']
   releases: IRelease[]
}> = ({ name, assets, releases, slug }) => {

   const tooltip = useTooltip('release')

   return (
      <Layout title={name} image={assets.icon} description={`Changelog for ${name}`}>
         {tooltip}

         <Background src={assets.background} size={0.5} />

         <Title noline subtitle={{ link: `/${slug}`, name }}>
            Changelog
         </Title>

         <Releases>
            <Timeline>
               {releases?.map(r =>
                  <Release key={r.version} {...r}>
                     <TimelineDot />
                  </Release>
               )}
            </Timeline>
         </Releases>

      </Layout>
   )
}

const Releases = styled.ul`
   position: relative;
   padding-top: 2rem;
   display: grid;
   gap: 2rem;
   margin: 0 auto;
   width: min-content;
`

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
   await database()

   const [pack] = await Pack.aggregate<IPack>([
      { $match: { slug: params?.pack } },
      {
         $lookup: {
            from: 'releases',
            localField: '_id',
            foreignField: 'pack',
            as: 'releases',
         },
      },
      { $unwind: { path: '$releases', preserveNullAndEmptyArrays: true } },
      { $sort: { 'releases.date': -1 } },
      {
         $group: {
            _id: '$_id',
            name: { $first: '$name' },
            assets: { $first: '$assets' },
            links: { $first: '$links' },
            slug: { $first: '$slug' },
            releases: { $push: '$releases' },
         },
      },
   ])

   if (!pack) return { notFound: true }

   return { props: serialize(pack) }
}

export default PackView